/**
 * TypeScript types for FinLog application.
 */

// --- Auth & Users ---

export interface UserModule {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
}

export interface UserProfile {
  id: string;
  auth_id: string;
  email: string;
  display_name: string;
  role: "admin" | "user";
  is_active: boolean;
  modules: UserModule[];
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  modules: string[];
  created_at: string;
}

export interface AdminUserDetail {
  id: string;
  auth_id: string;
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  modules: UserModule[];
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_modules: number;
}

// --- Debt Management Module ---

export interface Broker {
  id: string;
  name: string;
  created_at: string;
  debt: number;
}

export type TransactionType = "accrual" | "payment" | "transfer" | "cash";
export type TransactionSource = "manual" | "receipt";

export interface Transaction {
  id: string;
  broker_id: string;
  type: TransactionType;
  amount: number;
  datetime: string;
  receipt_number?: string | null;
  party_from?: string | null;
  party_to?: string | null;
  kbk?: string | null;
  knp?: string | null;
  comment?: string | null;
  source: TransactionSource;
  raw_text?: string | null;
  created_at: string;
}

export interface TransactionCreate {
  broker_id: string;
  type: TransactionType;
  amount: number;
  datetime: string;
  receipt_number?: string;
  party_from?: string;
  party_to?: string;
  kbk?: string;
  knp?: string;
  comment?: string;
  source?: TransactionSource;
  raw_text?: string;
}

export interface ReceiptParseResult {
  type: TransactionType;
  amount?: number | null;
  datetime?: string | null;
  receipt_number?: string | null;
  party_from?: string | null;
  party_to?: string | null;
  kbk?: string | null;
  knp?: string | null;
  comment?: string | null;
  raw_text: string;
  errors: string[];
}

export interface DebtInfo {
  broker_id: string;
  debt: number;
  is_overpayment: boolean;
}

// --- Excel Converter Module ---

export interface ConverterPreview {
  columns: string[];
  sample_rows: string[][];
  row_count: number;
  column_types: Record<string, "text" | "numeric">;
}

export interface ConverterProcessResult {
  columns: string[];
  preview_rows: (string | number)[][];
  original_count: number;
  grouped_count: number;
}

export type AggregationRule = "sum" | "unique_join" | "first" | "count" | "skip";
