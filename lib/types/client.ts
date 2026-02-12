export interface Client {
  id: string;
  name: string;
  phone: string | null;
  vin: string | null;
  role: "client" | "master";
  bonus_balance: number;
  total_purchases_sum: number;
  total_orders_count: number;
  created_at: string;
}

export interface CreateClientInput {
  name: string;
  phone?: string;
  vin?: string;
  role: "client" | "master";
}
