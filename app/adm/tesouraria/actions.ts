"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function readAmount(formData: FormData, name: string) {
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return 0;
  if (!/^\d{1,12}$/.test(raw)) return null;
  const amount = Number(raw);
  return Number.isSafeInteger(amount) ? amount : null;
}

function readTransaction(formData: FormData) {
  const movement_type = String(formData.get("movement_type") ?? "").trim();
  const transaction_date = String(formData.get("transaction_date") ?? "").trim();
  const counterparty = String(formData.get("counterparty") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const bronze = readAmount(formData, "bronze");
  const prata = readAmount(formData, "prata");
  const ouro = readAmount(formData, "ouro");
  const platina = readAmount(formData, "platina");

  if (
    !["entrada", "saida"].includes(movement_type) ||
    !datePattern.test(transaction_date) ||
    counterparty.length < 2 ||
    counterparty.length > 160 ||
    description.length > 3000 ||
    bronze === null ||
    prata === null ||
    ouro === null ||
    platina === null ||
    bronze + prata + ouro + platina <= 0
  ) {
    return null;
  }

  return {
    movement_type,
    transaction_date,
    counterparty,
    description,
    bronze,
    prata,
    ouro,
    platina,
  };
}

export async function createTreasuryTransaction(formData: FormData) {
  const current = await requireRole(["admin", "funcionario"]);
  const destination = current.role === "admin" ? "/adm/tesouraria" : "/tesouraria";
  const supabase = await createClient();
  let counterpartyEmployeeId: string | null = null;
  if (current.role !== "admin") {
    if (!current.employee_id || formData.get("movement_type") !== "entrada") {
      redirect(`${destination}?erro=permissao`);
    }
    const { data: employee, error } = await supabase.from("employees")
      .select("id,name").eq("code", current.employee_id).maybeSingle();
    if (error || !employee) redirect(`${destination}?erro=permissao`);
    // Identity comes from the authenticated account, never from submitted names/IDs.
    counterpartyEmployeeId = employee.id;
    formData.set("counterparty", employee.name);
  }
  const input = readTransaction(formData);
  if (!input) redirect(`${destination}?erro=dados`);

  const { error } = await supabase.from("treasury_transactions").insert({
    ...input,
    ...(counterpartyEmployeeId ? { counterparty_employee_id: counterpartyEmployeeId } : {}),
    created_by: current.id,
    updated_by: current.id,
  });

  if (error) redirect(`${destination}?erro=salvar`);
  revalidatePath("/adm/tesouraria");
  revalidatePath("/tesouraria");
  redirect(`${destination}?criado=1`);
}

export async function updateTreasuryTransaction(formData: FormData) {
  const current = await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "").trim();
  const input = readTransaction(formData);
  if (!uuidPattern.test(id) || !input) redirect("/adm/tesouraria?erro=dados");

  const supabase = await createClient();
  const { error } = await supabase
    .from("treasury_transactions")
    .update({ ...input, updated_by: current.id, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) redirect("/adm/tesouraria?erro=salvar");
  revalidatePath("/adm/tesouraria");
  revalidatePath("/tesouraria");
  redirect("/adm/tesouraria?salvo=1");
}

export async function deleteTreasuryTransaction(formData: FormData) {
  await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "").trim();
  if (!uuidPattern.test(id)) redirect("/adm/tesouraria?erro=dados");

  const supabase = await createClient();
  const { error } = await supabase.from("treasury_transactions").delete().eq("id", id);

  if (error) redirect("/adm/tesouraria?erro=excluir");
  revalidatePath("/adm/tesouraria");
  revalidatePath("/tesouraria");
  redirect("/adm/tesouraria?excluido=1");
}
