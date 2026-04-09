/**
 * API client for FinLog backend.
 */

import type {
  Broker,
  Transaction,
  TransactionCreate,
  ReceiptParseResult,
  DebtInfo,
  UserProfile,
  AdminUser,
  AdminUserDetail,
  AdminStats,
  UserModule,
  ConverterPreview,
  ConverterProcessResult,
} from "@/types";
import { supabase } from "@/lib/supabaseClient";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const authHeaders = await getAuthHeaders();

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `API error: ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// --- Auth ---

export async function getMyProfile(): Promise<UserProfile> {
  return request<UserProfile>("/auth/me");
}

// --- Brokers ---

export async function getBrokers(): Promise<Broker[]> {
  return request<Broker[]>("/brokers");
}

export async function createBroker(name: string): Promise<Broker> {
  return request<Broker>("/brokers", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteBroker(id: string): Promise<void> {
  return request<void>(`/brokers/${id}`, { method: "DELETE" });
}

// --- Transactions ---

export async function getTransactions(brokerId: string): Promise<Transaction[]> {
  return request<Transaction[]>(`/brokers/${brokerId}/transactions`);
}

export async function getDebt(brokerId: string): Promise<DebtInfo> {
  return request<DebtInfo>(`/brokers/${brokerId}/debt`);
}

export async function createTransaction(
  data: TransactionCreate
): Promise<Transaction> {
  return request<Transaction>("/transactions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  return request<void>(`/transactions/${id}`, { method: "DELETE" });
}

// --- Receipts ---

export async function uploadReceipt(file: File): Promise<ReceiptParseResult> {
  const authHeaders = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/receipts/upload`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload error: ${res.status}`);
  }

  return res.json();
}

export async function bulkUploadReceipts(files: File[]): Promise<ReceiptParseResult[]> {
  const authHeaders = await getAuthHeaders();
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${API_BASE}/receipts/bulk_upload`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Bulk upload error: ${res.status}`);
  }

  return res.json();
}

export async function bulkCreateTransactions(
  data: TransactionCreate[]
): Promise<Transaction[]> {
  return request<Transaction[]>("/transactions/bulk", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Helper to get export URL (needs auth token in URL for download)
export function getExportUrl(brokerId: string): string {
  return `${API_BASE}/brokers/${brokerId}/export`;
}

export async function downloadExport(brokerId: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/brokers/${brokerId}/export`, {
    headers: authHeaders,
  });
  if (!res.ok) {
    throw new Error("Export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const disposition = res.headers.get("Content-Disposition");
  const filename = disposition
    ? decodeURIComponent(disposition.split("filename*=UTF-8''")[1] || "export.xlsx")
    : "export.xlsx";
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Admin ---

export async function getAdminStats(): Promise<AdminStats> {
  return request<AdminStats>("/admin/stats");
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  return request<AdminUser[]>("/admin/users");
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  return request<AdminUserDetail>(`/admin/users/${userId}`);
}

export async function updateUserModules(
  userId: string,
  moduleIds: string[]
): Promise<string[]> {
  return request<string[]>(`/admin/users/${userId}/modules`, {
    method: "PATCH",
    body: JSON.stringify({ module_ids: moduleIds }),
  });
}

export async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<AdminUser> {
  return request<AdminUser>(`/admin/users/${userId}/active`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function deleteUser(userId: string): Promise<void> {
  return request<void>(`/admin/users/${userId}`, { method: "DELETE" });
}

export async function getAdminModules(): Promise<UserModule[]> {
  return request<UserModule[]>("/admin/modules");
}

export async function createUserProfile(data: {
  auth_id: string;
  email: string;
  display_name: string;
  role?: string;
  module_ids?: string[];
}): Promise<AdminUserDetail> {
  return request<AdminUserDetail>("/admin/users", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Excel Converter ---

export async function converterPreview(file: File): Promise<ConverterPreview> {
  const authHeaders = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/converter/preview`, {
    method: "POST",
    headers: authHeaders,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Preview error: ${res.status}`);
  }

  return res.json();
}

export async function converterPreviewStored(sheetName: string): Promise<ConverterPreview> {
  return request<ConverterPreview>("/converter/preview-stored", {
    method: "POST",
    body: JSON.stringify({ sheet_name: sheetName }),
  });
}

export async function converterProcess(
  groupByColumn: string,
  columnRules: Record<string, string>,
  sheetName?: string
): Promise<ConverterProcessResult> {
  return request<ConverterProcessResult>("/converter/process", {
    method: "POST",
    body: JSON.stringify({
      group_by_column: groupByColumn,
      column_rules: columnRules,
      sheet_name: sheetName,
    }),
  });
}

export async function converterDownload(
  groupByColumn: string,
  columnRules: Record<string, string>,
  sheetName?: string
): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/converter/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      group_by_column: groupByColumn,
      column_rules: columnRules,
      sheet_name: sheetName,
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Download error: ${res.status}`);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "grouped_result.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function converterClear(): Promise<void> {
  return request<void>("/converter/clear", { method: "DELETE" });
}
