import { supabase } from "@/lib/supabaseClient";
import type {
  CreatePurchaseInput,
  DailySalesSummary,
  RefundTransactionInput,
  Transaction,
} from "@/lib/types/transaction";

const BONUS_EARN_RATE = 0.03;
const TEN_HOURS_IN_MS = 10 * 60 * 60 * 1000;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function fetchAvailableBonusBalance(
  clientId: string
): Promise<number> {
  const thresholdIso = new Date(Date.now() - TEN_HOURS_IN_MS).toISOString();

  const { data, error } = await supabase
    .from("transactions")
    .select("bonus_earned, bonus_used, created_at")
    .eq("client_id", clientId)
    .lte("created_at", thresholdIso);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<
    Pick<Transaction, "bonus_earned" | "bonus_used">
  >;

  const total = rows.reduce(
    (acc, row) => acc + row.bonus_earned - row.bonus_used,
    0
  );

  return roundMoney(Math.max(0, total));
}

export async function fetchAvailableBonusBalancesForClients(
  clientIds: string[]
): Promise<Record<string, number>> {
  if (clientIds.length === 0) {
    return {};
  }

  const thresholdIso = new Date(Date.now() - TEN_HOURS_IN_MS).toISOString();

  const { data, error } = await supabase
    .from("transactions")
    .select("client_id, bonus_earned, bonus_used, created_at")
    .in("client_id", clientIds)
    .lte("created_at", thresholdIso);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<
    Pick<Transaction, "client_id" | "bonus_earned" | "bonus_used">
  >;

  const result: Record<string, number> = {};

  for (const row of rows) {
    const current = result[row.client_id] ?? 0;
    const updated = current + row.bonus_earned - row.bonus_used;
    result[row.client_id] = updated;
  }

  Object.keys(result).forEach((key) => {
    result[key] = roundMoney(Math.max(0, result[key]));
  });

  return result;
}

export interface ClientPurchaseItem {
  id: string;
  created_at: string;
  purchase_amount: number;
}

export async function fetchPurchasesByClientId(
  clientId: string
): Promise<ClientPurchaseItem[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, created_at, purchase_amount")
    .eq("client_id", clientId)
    .eq("is_refund", false)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClientPurchaseItem[];
}

export async function createPurchase(
  input: CreatePurchaseInput
): Promise<Transaction> {
  const { client_id, purchase_amount, bonus_used } = input;

  const final_paid = roundMoney(purchase_amount - bonus_used);
  const bonus_earned = roundMoney(final_paid * BONUS_EARN_RATE);

  const { data: txData, error: txError } = await supabase
    .from("transactions")
    .insert({
      client_id,
      purchase_amount,
      bonus_used,
      bonus_earned,
      final_paid,
      is_refund: false,
      refund_for: null,
    })
    .select()
    .single();

  if (txError) {
    throw new Error(txError.message);
  }

  const { data: clientData, error: fetchError } = await supabase
    .from("clients")
    .select("bonus_balance, total_purchases_sum, total_orders_count")
    .eq("id", client_id)
    .single();

  if (fetchError || !clientData) {
    throw new Error("Не удалось обновить данные клиента");
  }

  const current = clientData as {
    bonus_balance: number;
    total_purchases_sum: number;
    total_orders_count: number;
  };

  const { error: updateError } = await supabase
    .from("clients")
    .update({
      bonus_balance: roundMoney(
        current.bonus_balance - bonus_used + bonus_earned
      ),
      total_purchases_sum: roundMoney(
        current.total_purchases_sum + purchase_amount
      ),
      total_orders_count: current.total_orders_count + 1,
    })
    .eq("id", client_id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return txData as Transaction;
}

export async function fetchDailySalesSummaries(): Promise<DailySalesSummary[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, purchase_amount, bonus_used, bonus_earned, final_paid, created_at, is_refund"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<
    Pick<
      Transaction,
      | "id"
      | "purchase_amount"
      | "bonus_used"
      | "bonus_earned"
      | "final_paid"
      | "created_at"
      | "is_refund"
    >
  >;

  const summariesMap = new Map<string, DailySalesSummary>();

  for (const row of rows) {
    if (row.is_refund) {
      // Возвраты не считаем как продажи
      continue;
    }

    const date = row.created_at.slice(0, 10);
    const existing = summariesMap.get(date);

    const base: DailySalesSummary =
      existing ??
      {
        date,
        total_purchase_amount: 0,
        total_final_paid: 0,
        total_bonus_used: 0,
        total_bonus_earned: 0,
        orders_count: 0,
      };

    base.total_purchase_amount = roundMoney(
      base.total_purchase_amount + row.purchase_amount
    );
    base.total_final_paid = roundMoney(base.total_final_paid + row.final_paid);
    base.total_bonus_used = roundMoney(base.total_bonus_used + row.bonus_used);
    base.total_bonus_earned = roundMoney(
      base.total_bonus_earned + row.bonus_earned
    );
    base.orders_count += 1;

    summariesMap.set(date, base);
  }

  const summaries = Array.from(summariesMap.values());
  summaries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return summaries;
}

export interface SalesTransactionWithRefundFlag extends Transaction {
  is_refunded: boolean;
}

export async function fetchTransactionsForDate(
  date: string
): Promise<SalesTransactionWithRefundFlag[]> {
  const start = `${date}T00:00:00`;
  const end = `${date}T23:59:59.999`;

  const { data: baseData, error: baseError } = await supabase
    .from("transactions")
    .select("*")
    .gte("created_at", start)
    .lte("created_at", end)
    .eq("is_refund", false)
    .order("created_at", { ascending: true });

  if (baseError) {
    throw new Error(baseError.message);
  }

  const baseTransactions = (baseData ?? []) as Transaction[];
  if (baseTransactions.length === 0) {
    return [];
  }

  const ids = baseTransactions.map((t) => t.id);

  const { data: refundsData, error: refundsError } = await supabase
    .from("transactions")
    .select("id, refund_for")
    .in("refund_for", ids);

  if (refundsError) {
    throw new Error(refundsError.message);
  }

  const refundedIds = new Set<string>(
    (refundsData ?? []).map((r) => (r.refund_for ?? "") as string)
  );

  return baseTransactions.map((tx) => ({
    ...tx,
    is_refunded: refundedIds.has(tx.id),
  }));
}

export async function refundTransaction(
  input: RefundTransactionInput
): Promise<Transaction> {
  const { transaction_id } = input;

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transaction_id)
    .single();

  if (txError || !tx) {
    throw new Error("Транзакция не найдена");
  }

  const transaction = tx as Transaction;

  if (transaction.is_refund) {
    throw new Error("Нельзя оформить возврат для возвратной операции");
  }

  const { data: existingRefund, error: existingRefundError } = await supabase
    .from("transactions")
    .select("id")
    .eq("refund_for", transaction_id)
    .maybeSingle();

  if (existingRefundError) {
    throw new Error(existingRefundError.message);
  }

  if (existingRefund) {
    throw new Error("Для этой покупки уже оформлен возврат");
  }

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .select("bonus_balance, total_purchases_sum, total_orders_count")
    .eq("id", transaction.client_id)
    .single();

  if (clientError || !clientData) {
    throw new Error("Не удалось загрузить данные клиента");
  }

  const current = clientData as {
    bonus_balance: number;
    total_purchases_sum: number;
    total_orders_count: number;
  };

  const bonusChange = transaction.bonus_used - transaction.bonus_earned;

  const { data: refundTx, error: refundError } = await supabase
    .from("transactions")
    .insert({
      client_id: transaction.client_id,
      purchase_amount: -transaction.purchase_amount,
      bonus_used: -transaction.bonus_used,
      bonus_earned: -transaction.bonus_earned,
      final_paid: -transaction.final_paid,
      is_refund: true,
      refund_for: transaction.id,
    })
    .select()
    .single();

  if (refundError) {
    throw new Error(refundError.message);
  }

  const { error: updateClientError } = await supabase
    .from("clients")
    .update({
      bonus_balance: roundMoney(current.bonus_balance + bonusChange),
      total_purchases_sum: roundMoney(
        current.total_purchases_sum - transaction.purchase_amount
      ),
      total_orders_count: current.total_orders_count - 1,
    })
    .eq("id", transaction.client_id);

  if (updateClientError) {
    throw new Error(updateClientError.message);
  }

  return refundTx as Transaction;
}
