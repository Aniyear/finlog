/**
 * API client for FinLog backend.
 */

import type {
  Broker,
  Transaction,
  TransactionCreate,
  ReceiptParseResult,
  DebtInfo,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
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
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/receipts/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Upload error: ${res.status}`);
  }

  return res.json();
}
