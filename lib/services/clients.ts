import { supabase } from "@/lib/supabaseClient";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Client, CreateClientInput } from "@/lib/types/client";

export async function fetchClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Client[];
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name,
      phone: input.phone ?? null,
      vin: input.vin ?? null,
      role: input.role,
      bonus_balance: 0,
      total_purchases_sum: 0,
      total_orders_count: 0,
    })
    .select()
    .single();

  if (error) {
    const pgError = error as PostgrestError;

    if (pgError.code === "23505") {
      throw new Error("Клиент с таким телефоном уже существует");
    }

    throw new Error(pgError.message);
  }

  return data as Client;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
