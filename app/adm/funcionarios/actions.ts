"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type EmployeeInput = {
  code: string;
  name: string;
  role_title: string;
  position_title: string | null;
  honor_title: string | null;
  specialty: string;
  initials: string;
  sort_order: number;
};
const honorTitles = new Set(["", "Katyusha", "Ilya", "Dobrynya", "Alyosha", "Rasputin", "Baba Yaga", "Vasilisa"]);

function createInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const value = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0].slice(0, 2);

  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function readEmployee(formData: FormData): EmployeeInput | null {
  const code = formData.get("code");
  const name = formData.get("name");
  const roleTitle = formData.get("role_title");
  const positionTitle = formData.get("position_title");
  const honorTitle = formData.get("honor_title");
  const specialty = formData.get("specialty");
  const sortOrderValue = formData.get("sort_order");
  const sortOrder = Number(sortOrderValue);

  if (
    typeof code !== "string" || code.trim().length < 2 || code.trim().length > 20 ||
    typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80 ||
    typeof roleTitle !== "string" || roleTitle.trim().length < 2 || roleTitle.trim().length > 80 ||
    typeof positionTitle !== "string" || positionTitle.trim().length > 80 ||
    typeof honorTitle !== "string" || !honorTitles.has(honorTitle.trim()) ||
    typeof specialty !== "string" || specialty.trim().length < 2 || specialty.trim().length > 160 ||
    !Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999
  ) {
    return null;
  }

  return {
    code: code.trim().toUpperCase(),
    name: name.trim(),
    role_title: roleTitle.trim(),
    position_title: positionTitle.trim() || null,
    honor_title: honorTitle.trim() || null,
    specialty: specialty.trim(),
    initials: createInitials(name),
    sort_order: sortOrder,
  };
}

export async function createEmployee(formData: FormData) {
  await requireRole(["admin"]);
  const employee = readEmployee(formData);

  if (!employee) redirect("/adm/funcionarios?erro=dados#novo");

  const supabase = await createClient();
  const { error } = await supabase.from("employees").insert(employee);

  if (error) {
    redirect(`/adm/funcionarios?erro=${error.code === "23505" ? "codigo" : "salvar"}#novo`);
  }

  revalidatePath("/funcionarios");
  revalidatePath("/adm/funcionarios");
  revalidatePath("/");
  redirect("/adm/funcionarios?criado=1#lista");
}

export async function toggleEmployeeStatus(formData: FormData) {
  await requireRole(["admin"]);
  const id = formData.get("id");
  const nextStatus = formData.get("employee_status");

  if (
    typeof id !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(id) ||
    (nextStatus !== "active" && nextStatus !== "inactive" && nextStatus !== "deceased")
  ) {
    redirect("/adm/funcionarios?erro=dados#lista");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({
      employee_status: nextStatus,
      is_active: nextStatus === "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect("/adm/funcionarios?erro=salvar#lista");

  revalidatePath("/funcionarios");
  revalidatePath("/adm/funcionarios");
  redirect("/adm/funcionarios?salvo=1#lista");
}
