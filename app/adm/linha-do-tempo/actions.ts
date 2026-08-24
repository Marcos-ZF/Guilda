"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function readEntry(formData: FormData) {
  const entry_type = String(formData.get("entry_type") ?? "").trim();
  const entry_date = String(formData.get("entry_date") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (entry_type.length < 2 || entry_type.length > 40 || !/^\d{4}-\d{2}-\d{2}$/.test(entry_date) || title.length < 2 || title.length > 160 || description.length < 2 || description.length > 5000) return null;
  return { entry_type, entry_date, title, description };
}

function readEmployees(formData: FormData) {
  return [...new Set(formData.getAll("employee_ids").map(String))]
    .filter(id => /^[0-9a-f-]{36}$/i.test(id));
}

export async function createTimelineEntry(formData: FormData) {
  await requireRole(["admin"]);
  const input = readEntry(formData);
  if (!input) redirect("/adm/linha-do-tempo?erro=dados");
  const supabase = await createClient();
  const { data, error } = await supabase.from("timeline_entries").insert(input).select("id").single<{ id: string }>();
  if (error || !data) redirect("/adm/linha-do-tempo?erro=salvar");
  const employeeIds = readEmployees(formData);
  if (employeeIds.length) {
    const { error: peopleError } = await supabase.from("timeline_entry_employees").insert(employeeIds.map(employee_id => ({ timeline_entry_id: data.id, employee_id })));
    if (peopleError) redirect("/adm/linha-do-tempo?erro=envolvidos");
  }
  revalidatePath("/"); revalidatePath("/adm/linha-do-tempo");
  redirect("/adm/linha-do-tempo?criado=1");
}

export async function updateTimelineEntry(formData: FormData) {
  await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  const input = readEntry(formData);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !input) redirect("/adm/linha-do-tempo?erro=dados");
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_entries").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) redirect("/adm/linha-do-tempo?erro=salvar");
  const employeeIds = readEmployees(formData);
  const { error: deleteError } = await supabase.from("timeline_entry_employees").delete().eq("timeline_entry_id", id);
  if (deleteError) redirect("/adm/linha-do-tempo?erro=envolvidos");
  if (employeeIds.length) {
    const { error: peopleError } = await supabase.from("timeline_entry_employees").insert(employeeIds.map(employee_id => ({ timeline_entry_id: id, employee_id })));
    if (peopleError) redirect("/adm/linha-do-tempo?erro=envolvidos");
  }
  revalidatePath("/"); revalidatePath("/adm/linha-do-tempo");
  redirect("/adm/linha-do-tempo?salvo=1");
}

export async function deleteTimelineEntry(formData: FormData) {
  await requireRole(["admin"]);
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/adm/linha-do-tempo?erro=dados");
  const supabase = await createClient();
  const { error } = await supabase.from("timeline_entries").delete().eq("id", id);
  if (error) redirect("/adm/linha-do-tempo?erro=excluir");
  revalidatePath("/"); revalidatePath("/adm/linha-do-tempo");
  redirect("/adm/linha-do-tempo?excluido=1");
}

export async function updateServiceTime(formData: FormData) {
  await requireRole(["admin"]);
  const value = String(formData.get("service_time") ?? "").trim();
  if (!value || value.length > 30) redirect("/adm/linha-do-tempo?erro=tempo");
  const supabase = await createClient();
  const { error } = await supabase.from("site_settings").upsert({ key: "service_time", value, updated_at: new Date().toISOString() });
  if (error) redirect("/adm/linha-do-tempo?erro=salvar");
  revalidatePath("/"); revalidatePath("/adm/linha-do-tempo");
  redirect("/adm/linha-do-tempo?tempo=1");
}
