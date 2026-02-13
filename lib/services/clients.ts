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

export interface UpdateClientInput {
  name?: string;
  vin?: string | null;
}

export async function updateClient(
  id: string,
  data: UpdateClientInput
): Promise<Client> {
  const payload: { name?: string; vin?: string | null } = {};
  if (data.name !== undefined) {
    payload.name = data.name.trim();
  }
  if (data.vin !== undefined) {
    payload.vin =
      data.vin == null || data.vin === ""
        ? null
        : data.vin.trim() || null;
  }
  if (Object.keys(payload).length === 0) {
    const { data: current, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    return current as Client;
  }

  const { data: updated, error } = await supabase
    .from("clients")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return updated as Client;
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
