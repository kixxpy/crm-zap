import { supabase } from "@/lib/supabaseClient";
import type { PostgrestError } from "@supabase/supabase-js";
import type {
  ClientVin,
  CreateClientVinInput,
  UpdateClientVinInput,
} from "@/lib/types/client";

const VIN_LENGTH = 17;
const VIN_REGEX = /^[A-Za-z0-9]{17}$/;

function normalizeVin(value: string): string {
  return value.trim().toUpperCase();
}

function validateVin(vin: string): void {
  if (vin.length !== VIN_LENGTH || !VIN_REGEX.test(vin)) {
    throw new Error(
      `VIN должен содержать ${VIN_LENGTH} символов: латинские буквы и цифры`
    );
  }
}

export async function fetchClientVins(clientId: string): Promise<ClientVin[]> {
  const { data, error } = await supabase
    .from("client_vins")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClientVin[];
}

export async function addClientVin(
  clientId: string,
  input: CreateClientVinInput
): Promise<ClientVin> {
  const vin = normalizeVin(input.vin);
  validateVin(vin);

  const machineLabel =
    input.machine_label != null && input.machine_label.trim() !== ""
      ? input.machine_label.trim()
      : null;

  const { data, error } = await supabase
    .from("client_vins")
    .insert({
      client_id: clientId,
      vin,
      machine_label: machineLabel,
    })
    .select()
    .single();

  if (error) {
    const pgError = error as PostgrestError;
    if (pgError.code === "23505") {
      throw new Error("У этого клиента уже есть такой VIN");
    }
    throw new Error(error.message);
  }

  return data as ClientVin;
}

export async function updateClientVin(
  id: string,
  data: UpdateClientVinInput
): Promise<ClientVin> {
  const payload: { machine_label?: string | null } = {};
  if (data.machine_label !== undefined) {
    payload.machine_label =
      data.machine_label == null || data.machine_label.trim() === ""
        ? null
        : data.machine_label.trim();
  }

  if (Object.keys(payload).length === 0) {
    const { data: current, error: fetchError } = await supabase
      .from("client_vins")
      .select("*")
      .eq("id", id)
      .single();
    if (fetchError) throw new Error(fetchError.message);
    return current as ClientVin;
  }

  const { data: updated, error } = await supabase
    .from("client_vins")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return updated as ClientVin;
}

export async function deleteClientVin(id: string): Promise<void> {
  const { error } = await supabase.from("client_vins").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
