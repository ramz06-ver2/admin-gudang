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
    'barang_keluar', 'pekerja', 'spb', 'po', 'surat_jalan'
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
-- 2. account_requests: berisi data sensitif -> anon TIDAK boleh membaca.
--    anon hanya boleh INSERT (form pendaftaran) dengan status 'pending'.
--    Persetujuan/penolakan/ubah role: hanya authenticated.
--    TODO (disarankan): batasi UPDATE hanya untuk superuser via app_metadata.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.account_requests') is null then
    raise notice 'Tabel public.account_requests tidak ditemukan, dilewati';
    return;
  end if;

  alter table public.account_requests enable row level security;
  alter table public.account_requests force row level security;

  drop policy if exists account_requests_insert_anon_pending on public.account_requests;
  drop policy if exists account_requests_select_auth         on public.account_requests;
  drop policy if exists account_requests_update_auth         on public.account_requests;
  drop policy if exists account_requests_delete_auth         on public.account_requests;

  create policy account_requests_insert_anon_pending
    on public.account_requests for insert to anon, authenticated
    with check (status = 'pending');

  create policy account_requests_select_auth
    on public.account_requests for select to authenticated using (true);

  create policy account_requests_update_auth
    on public.account_requests for update to authenticated
    using (true) with check (true);

  create policy account_requests_delete_auth
    on public.account_requests for delete to authenticated using (true);

  revoke select, update, delete, truncate on public.account_requests from anon;
end $$;

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
-- =============================================================================

