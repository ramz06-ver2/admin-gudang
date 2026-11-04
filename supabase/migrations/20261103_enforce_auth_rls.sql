-- =============================================================================
-- Enforce authentication on all write operations (INSERT/UPDATE/DELETE + RPC)
-- =============================================================================
-- Tujuan : hanya user yang sudah login (role `authenticated`, JWT valid) yang
--          boleh menulis data. Role `anon` hanya boleh membaca tabel publik.
-- Prinsip: deny-by-default, least privilege, enforcement di sisi server.
-- Catatan: JALANKAN DI STAGING DULU. Migrasi ini idempotent (aman diulang).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Tabel data bisnis: baca publik, tulis hanya authenticated
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  business_tables text[] := array[
    'kategori', 'supplier', 'barang', 'barang_masuk',
    'barang_keluar', 'pekerja', 'po', 'surat_jalan'
  ];
begin
  foreach t in array business_tables loop
    if to_regclass('public.' || t) is null then
      raise notice 'Tabel public.% tidak ditemukan, dilewati', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);
    -- FORCE: RLS juga berlaku untuk owner tabel (kecuali service_role/bypassrls)
    execute format('alter table public.%I force row level security', t);

    -- Bersihkan policy lama milik migrasi ini agar idempotent
    execute format('drop policy if exists %I on public.%I', t || '_select_public', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_auth',   t);
    execute format('drop policy if exists %I on public.%I', t || '_update_auth',   t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_auth',   t);

    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (true)',
      t || '_select_public', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (true)',
      t || '_insert_auth', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (true) with check (true)',
      t || '_update_auth', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (true)',
      t || '_delete_auth', t);

    -- Cabut hak tulis langsung dari anon (defense-in-depth selain RLS)
    execute format('revoke insert, update, delete, truncate on public.%I from anon', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 1b. Tabel spb: baca dibedakan berdasarkan status
--     - anon        : hanya baris yang statusnya BUKAN 'belum di proses'
--     - authenticated: semua baris
--     Tulis (INSERT/UPDATE/DELETE): hanya authenticated.
--     Kolom source_file (link Drive) ikut terbaca publik pada baris yang
--     boleh dilihat, sesuai kebutuhan produk.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.spb') is null then
    raise notice 'Tabel public.spb tidak ditemukan, dilewati';
    return;
  end if;

  alter table public.spb enable row level security;
  alter table public.spb force row level security;

  drop policy if exists spb_select_public            on public.spb;
  drop policy if exists spb_select_processed_public  on public.spb;
  drop policy if exists spb_select_all_auth          on public.spb;
  drop policy if exists spb_insert_auth              on public.spb;
  drop policy if exists spb_update_auth              on public.spb;
  drop policy if exists spb_delete_auth              on public.spb;

  -- Publik: status NULL atau selain 'belum di proses' (trim + case-insensitive,
  -- konsisten dengan aturan di sisi klien).
  create policy spb_select_processed_public
    on public.spb for select to anon, authenticated
    using (status is null or lower(btrim(status)) <> 'belum di proses');

  -- Login: boleh melihat semua termasuk 'belum di proses'.
  create policy spb_select_all_auth
    on public.spb for select to authenticated
    using (true);

  create policy spb_insert_auth
    on public.spb for insert to authenticated with check (true);
  create policy spb_update_auth
    on public.spb for update to authenticated using (true) with check (true);
  create policy spb_delete_auth
    on public.spb for delete to authenticated using (true);

  revoke insert, update, delete, truncate on public.spb from anon;
end $$;

-- -----------------------------------------------------------------------------
-- 2. account_requests + persetujuan akun
--
--    Alur: user daftar via Supabase Auth (signUp, password di-hash server) lalu
--    menambah baris permintaan di sini TANPA password. Akun baru TIDAK punya
--    role. Super User menyetujui lewat RPC di bawah, yang menulis role ke
--    auth.users.raw_app_meta_data (field yang tidak bisa diubah user dari browser).
--    Aplikasi membaca role HANYA dari app_metadata.
--
--    - anon        : hanya INSERT permintaan berstatus 'pending'
--    - authenticated: tidak bisa membaca/ubah langsung; hanya Super User yang
--                     boleh SELECT; perubahan status HANYA lewat RPC.
-- -----------------------------------------------------------------------------

-- Cabut sisa password plaintext dari skema lama (jika kolomnya ada).
alter table if exists public.account_requests drop column if exists password;

-- True jika JWT pemanggil memiliki app_metadata.role = 'superuser'.
create or replace function public.is_superuser()
returns boolean
language sql
stable
as $fn$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'superuser'
$fn$;

do $$
begin
  if to_regclass('public.account_requests') is null then
    raise notice 'Tabel public.account_requests tidak ditemukan, dilewati';
    return;
  end if;

  alter table public.account_requests enable row level security;
  -- Sengaja TIDAK `force`: fungsi SECURITY DEFINER di bawah dijalankan sebagai owner.
  alter table public.account_requests no force row level security;

  drop policy if exists account_requests_insert_anon_pending on public.account_requests;
  drop policy if exists account_requests_select_auth         on public.account_requests;
  drop policy if exists account_requests_select_superuser    on public.account_requests;
  drop policy if exists account_requests_update_auth         on public.account_requests;
  drop policy if exists account_requests_delete_auth         on public.account_requests;

  create policy account_requests_insert_anon_pending
    on public.account_requests for insert to anon, authenticated
    with check (status = 'pending');

  create policy account_requests_select_superuser
    on public.account_requests for select to authenticated
    using (public.is_superuser());

  -- Tidak ada policy UPDATE/DELETE: perubahan hanya lewat RPC superuser.
  revoke select, update, delete, truncate on public.account_requests from anon;
  revoke update, delete, truncate on public.account_requests from authenticated;
end $$;

-- Setujui akun + tetapkan role. Hanya Super User.
create or replace function public.approve_account(p_request_id text, p_role text default 'admin')
returns void
language plpgsql
security definer
set search_path = public, auth
as $fn$
declare
  v_email text;
  v_role  text := lower(btrim(coalesce(p_role, 'admin')));
begin
  if not public.is_superuser() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Role 'superuser'/'user' tidak boleh ditetapkan lewat jalur persetujuan.
  if v_role in ('', 'user', 'superuser') then
    v_role := 'admin';
  end if;

  select email into v_email
  from public.account_requests
  where id::text = p_request_id
  for update;

  if v_email is null then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', v_role)
   where lower(email) = lower(v_email);

  update public.account_requests
     set status = 'approved', role = v_role, decided_at = now()
   where id::text = p_request_id;
end
$fn$;

-- Tolak akun + cabut role. Hanya Super User.
create or replace function public.reject_account(p_request_id text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $fn$
declare
  v_email text;
begin
  if not public.is_superuser() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select email into v_email
  from public.account_requests
  where id::text = p_request_id
  for update;

  if v_email is null then
    raise exception 'request not found' using errcode = 'P0002';
  end if;

  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) - 'role'
   where lower(email) = lower(v_email);

  update public.account_requests
     set status = 'rejected', decided_at = now()
   where id::text = p_request_id;
end
$fn$;

-- Ubah role akun yang sudah disetujui. Hanya Super User.
create or replace function public.set_account_role(p_request_id text, p_role text)
returns void
language plpgsql
security definer
set search_path = public, auth
as $fn$
declare
  v_email text;
  v_role  text := lower(btrim(coalesce(p_role, 'admin')));
begin
  if not public.is_superuser() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_role in ('', 'user', 'superuser') then
    v_role := 'admin';
  end if;

  select email into v_email
  from public.account_requests
  where id::text = p_request_id and status = 'approved'
  for update;

  if v_email is null then
    raise exception 'approved request not found' using errcode = 'P0002';
  end if;

  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', v_role)
   where lower(email) = lower(v_email);

  update public.account_requests set role = v_role where id::text = p_request_id;
end
$fn$;

revoke all on function public.approve_account(text, text) from public, anon;
revoke all on function public.reject_account(text)        from public, anon;
revoke all on function public.set_account_role(text, text) from public, anon;
grant execute on function public.approve_account(text, text) to authenticated;
grant execute on function public.reject_account(text)        to authenticated;
grant execute on function public.set_account_role(text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- BOOTSTRAP Super User pertama (jalankan SEKALI, manual, sebagai owner di SQL
-- editor — bukan dari aplikasi). Ganti email dengan akun Supabase Auth Anda:
--
--   update auth.users
--      set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--                              || '{"role":"superuser"}'::jsonb
--    where lower(email) = lower('email-superuser@perusahaan.com');
--
-- Pengguna yang sudah ada juga perlu diberi role dengan cara yang sama
-- (mis. '{"role":"admin"}') karena aplikasi tidak lagi membaca user_metadata.
-- Setelah role diubah, pengguna harus login ulang agar JWT-nya diperbarui.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- 3. RPC yang memutasi data: cabut EXECUTE dari anon/public, beri ke authenticated.
--    Dicari lewat pg_proc agar tidak bergantung pada signature argumen.
-- -----------------------------------------------------------------------------
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('issue_stock', 'receive_stock')
  loop
    execute format('revoke execute on function %s from public, anon', fn.sig);
    execute format('grant  execute on function %s to authenticated', fn.sig);
  end loop;
end $$;

commit;

-- =============================================================================
-- Verifikasi manual (jalankan sebagai anon, harus GAGAL dengan 401/403/42501):
--   curl -X POST "$SUPABASE_URL/rest/v1/barang" \
--     -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
--     -d '{"nama":"test"}'
--   curl -X POST "$SUPABASE_URL/rest/v1/rpc/issue_stock" \
--     -H "apikey: $ANON_KEY" -H "Content-Type: application/json" -d '{}'
-- Verifikasi baca SPB (anon harus mengembalikan 0 baris):
--   curl "$SUPABASE_URL/rest/v1/spb?status=ilike.belum%20di%20proses&select=id" \
--     -H "apikey: $ANON_KEY"
-- =============================================================================

