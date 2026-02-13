import { supabase } from "@/lib/supabaseClient";
import type { PostgrestError } from "@supabase/supabase-js";
import type { Client, ClientVin, CreateClientInput } from "@/lib/types/client";

export async function fetchClients(): Promise<Client[]> {
  const [clientsResult, vinsResult] = await Promise.all([
    supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("client_vins").select("*").order("created_at", { ascending: true }),
  ]);

  if (clientsResult.error) {
    throw new Error(clientsResult.error.message);
  }

  const clients = (clientsResult.data ?? []) as Client[];
  const allVins = vinsResult.error ? [] : (vinsResult.data ?? []) as ClientVin[];

  const vinsByClientId = new Map<string, ClientVin[]>();
  for (const vin of allVins) {
    const list = vinsByClientId.get(vin.client_id) ?? [];
    list.push(vin);
    vinsByClientId.set(vin.client_id, list);
  }

  return clients.map((client) => ({
    ...client,
    vins: vinsByClientId.get(client.id) ?? [],
  }));
}

export async function createClient(input: CreateClientInput): Promise<Client> {
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name,
      phone: input.phone ?? null,
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

  return { ...data, vins: [] } as Client;
}

export interface UpdateClientInput {
  name?: string;
}

export async function updateClient(
  id: string,
  data: UpdateClientInput
): Promise<Client> {
  const payload: { name?: string } = {};
  if (data.name !== undefined) {
    payload.name = data.name.trim();
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
