import { supabaseClient } from "../../shared/lib/supabaseClient";
import { TABLES } from "../../shared/lib/constants";
import type { AccountRequest } from "../../shared/types";

const REQUESTS_STORAGE_KEY = "account-registration-requests";

export const readLocalRequests = (): AccountRequest[] => {
  try {
    const raw = localStorage.getItem(REQUESTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const writeLocalRequests = (requests: AccountRequest[]) => {
  try {
    localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // ignore storage error
  }
};

export const resetAccountRequests = () => {
  try {
    localStorage.removeItem(REQUESTS_STORAGE_KEY);
  } catch {
    // ignore
  }
};

export const getPendingRequestsCount = (): number => {
  return readLocalRequests().filter((r) => r.status === "pending").length;
};

export const getAccountRequests = async (): Promise<AccountRequest[]> => {
  const local = readLocalRequests();
  try {
    const res = await supabaseClient
      .from(TABLES.accountRequests)
      .select("*");
    if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
      const mergedMap = new Map<string, AccountRequest>();
      local.forEach((item) => mergedMap.set(item.email.toLowerCase(), item));
      res.data.forEach((row: any) => {
        const emailKey = String(row.email || "").toLowerCase();
        if (!emailKey) return;
        const existing = mergedMap.get(emailKey);
        mergedMap.set(emailKey, {
          id: String(row.id ?? existing?.id ?? Date.now()),
          name: row.name || existing?.name || "Calon Admin",
          email: row.email,
          password: row.password ?? existing?.password,
          role: "admin",
          status: row.status || existing?.status || "pending",
          createdAt: row.created_at || row.createdAt || existing?.createdAt || new Date().toISOString(),
          decidedAt: row.decided_at || row.decidedAt || existing?.decidedAt || null,
        });
      });
      const merged = Array.from(mergedMap.values());
      writeLocalRequests(merged);
      return merged;
    }
  } catch {
    // fallback ke localStorage jika tabel belum tersedia
  }
  return local;
};

export const registerAccountRequest = async (input: {
  name: string;
  email: string;
  password: string;
}): Promise<AccountRequest> => {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name || !email || !password) {
    throw new Error("Nama, email, dan password wajib diisi");
  }

  const existingList = readLocalRequests();
  const duplicate = existingList.find(
    (r) => r.email.toLowerCase() === email && r.status !== "rejected",
  );
  if (duplicate) {
    throw new Error(
      duplicate.status === "pending"
        ? "Email ini sudah terdaftar dan masih menunggu persetujuan Super User"
        : "Email ini sudah terdaftar sebagai Admin",
    );
  }

  const newRequest: AccountRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    email,
    password,
    role: "admin",
    status: "pending",
    createdAt: new Date().toISOString(),
    decidedAt: null,
  };

  const updated = [
    newRequest,
    ...existingList.filter((r) => r.email.toLowerCase() !== email),
  ];
  writeLocalRequests(updated);

  try {
    await supabaseClient.from(TABLES.accountRequests).insert([
      {
        id: newRequest.id,
        name: newRequest.name,
        email: newRequest.email,
        password: newRequest.password,
        role: "admin",
        status: "pending",
        created_at: newRequest.createdAt,
      },
    ]);
  } catch {
    // fallback ke localStorage
  }

  return newRequest;
};

export const approveAccountRequest = async (
  requestId: string,
): Promise<AccountRequest> => {
  const list = readLocalRequests();
  const idx = list.findIndex((r) => String(r.id) === String(requestId));
  const decidedAt = new Date().toISOString();

  let updatedItem: AccountRequest;
  if (idx >= 0) {
    updatedItem = {
      ...list[idx],
      status: "approved",
      role: "admin",
      decidedAt,
    };
    list[idx] = updatedItem;
    writeLocalRequests(list);
  } else {
    updatedItem = {
      id: requestId,
      name: "Admin Baru",
      email: "",
      role: "admin",
      status: "approved",
      createdAt: decidedAt,
      decidedAt,
    };
  }

  try {
    await supabaseClient
      .from(TABLES.accountRequests)
      .update({ status: "approved", decided_at: decidedAt })
      .eq("id", requestId);
  } catch {
    // fallback ke localStorage
  }

  return updatedItem;
};

export const rejectAccountRequest = async (
  requestId: string,
): Promise<AccountRequest> => {
  const list = readLocalRequests();
  const idx = list.findIndex((r) => String(r.id) === String(requestId));
  const decidedAt = new Date().toISOString();

  let updatedItem: AccountRequest;
  if (idx >= 0) {
    updatedItem = {
      ...list[idx],
      status: "rejected",
      decidedAt,
    };
    list[idx] = updatedItem;
    writeLocalRequests(list);
  } else {
    updatedItem = {
      id: requestId,
      name: "Calon Admin",
      email: "",
      role: "admin",
      status: "rejected",
      createdAt: decidedAt,
      decidedAt,
    };
  }

  try {
    await supabaseClient
      .from(TABLES.accountRequests)
      .update({ status: "rejected", decided_at: decidedAt })
      .eq("id", requestId);
  } catch {
    // fallback ke localStorage
  }

  return updatedItem;
};

export const findAccountRequestByEmail = (
  email: string,
): AccountRequest | undefined => {
  const normalized = email.trim().toLowerCase();
  return readLocalRequests().find((r) => r.email.toLowerCase() === normalized);
};