export type OperationType = "DEBT" | "PAYMENT";
export type ClientStatus = "all" | "debt" | "settled";

export interface ClientBase {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client extends ClientBase {
  total_debt: number;
  total_paid: number;
  current_balance: number;
  entries_count: number;
  last_operation_date: string | null;
}

export interface ClientDetailResponse {
  client: ClientBase & {
    entries_count: number;
    last_operation_date: string | null;
  };
  total_debt: number;
  total_paid: number;
  current_balance: number;
}

export interface Entry {
  id: number;
  client_id: number;
  operation_type: OperationType;
  amount: number;
  description: string;
  operation_date: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface Balance {
  total_debt: number;
  total_paid: number;
  current_balance: number;
}

export interface EntryMutationResponse extends Entry, Balance {}

export interface EntryDeleteResponse extends Balance {
  success: boolean;
  client_id: number;
}

export interface ActivityItem {
  id: number;
  client_id: number;
  client_name: string;
  operation_type: OperationType;
  amount: number;
  description: string;
  operation_date: string;
  created_at: string;
}

export interface StatsOverview {
  total_debtors: number;
  total_receivable_amount: number;
  total_collected_today: number;
  recent_activity: ActivityItem[];
}

export interface ShopSettings {
  shop_name: string;
  shop_phone: string;
  currency: string;
  updated_at: string | null;
}

export interface ClientInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface EntryInput {
  operation_type: OperationType;
  amount: string | number;
  description: string;
  operation_date?: string;
  note?: string | null;
}

export interface ApiErrorBody {
  error?: string;
  details?: unknown;
}
