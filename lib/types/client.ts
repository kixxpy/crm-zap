export interface ClientVin {
  id: string;
  client_id: string;
  vin: string;
  machine_label: string | null;
  created_at?: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  role: "client" | "master";
  bonus_balance: number;
  total_purchases_sum: number;
  total_orders_count: number;
  created_at: string;
  vins?: ClientVin[];
}

export interface CreateClientInput {
  name: string;
  phone?: string;
  role: "client" | "master";
}

export interface CreateClientVinInput {
  vin: string;
  machine_label?: string | null;
}

export interface UpdateClientVinInput {
  machine_label?: string | null;
}
