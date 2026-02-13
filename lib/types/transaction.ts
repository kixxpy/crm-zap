export interface Transaction {
  id: string;
  client_id: string;
  purchase_amount: number;
  bonus_used: number;
  bonus_earned: number;
  final_paid: number;
  created_at: string;
  is_refund: boolean;
  refund_for: string | null;
}

export interface CreatePurchaseInput {
  client_id: string;
  purchase_amount: number;
  bonus_used: number;
  /** При false бонусы с этой покупки не начисляются (режим «только списать»). По умолчанию true. */
  accrue_bonus?: boolean;
}

export interface DailySalesSummary {
  date: string;
  total_purchase_amount: number;
  total_final_paid: number;
  total_bonus_used: number;
  total_bonus_earned: number;
  orders_count: number;
}

export interface RefundTransactionInput {
  transaction_id: string;
}
