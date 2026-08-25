"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const sexes = new Set(["", "Feminino", "Masculino"]);
const honorTitles = new Set(["", "Katyusha", "Ilya", "Dobrynya", "Alyosha", "Rasputin", "Baba Yaga", "Vasilisa"]);
const equipmentTypes = new Set(["Arma", "Acessório", "Armadura"]);
const equipmentRarities = new Set(["common", "rare", "epic", "legendary"]);
const employeeStatuses = new Set(["active", "inactive", "deceased"]);
async function requireManager(employeeId: string) {
  const profile = await requireRole(["funcionario", "admin"]);
  const supabase = await createClient();
  const { data: employee } = await supabase.from("employees").select("id, code").eq("id", employeeId).single<{ id: string; code: string }>();
  if (!employee || (profile.role !== "admin" && profile.employee_id !== employee.code)) redirect("/?erro=sem-permissao");
  return { employee, supabase };
}
async function uploadImage(employeeId: string, file: File, folder: string) {
  if (!file.size) return null;
  if (file.size > 5 * 1024 * 1024 || !imageTypes.has(file.type)) throw new Error("invalid-image");
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${employeeId}/${folder}/${crypto.randomUUID()}.${extension}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from("employee-media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("employee-media").getPublicUrl(path).data.publicUrl;
}

async function reorderEquipment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
  itemId: string,
  requestedPosition: number,
) {
  const { data, error } = await supabase
    .from("employee_equipment")
    .select("id")
    .eq("employee_id", employeeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  const orderedIds = (data ?? []).map((row) => String(row.id)).filter((id) => id !== itemId);
  const targetIndex = Math.min(Math.max(requestedPosition - 1, 0), orderedIds.length);
  orderedIds.splice(targetIndex, 0, itemId);

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("employee_equipment")
        .update({ sort_order: index + 1 })
        .eq("id", id)
        .eq("employee_id", employeeId),
    ),
  );

  const reorderError = results.find((result) => result.error)?.error;
  if (reorderError) throw reorderError;
}

async function reorderAchievements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
  itemId: string,
  requestedPosition: number,
) {
  const { data, error } = await supabase
    .from("employee_achievements")
    .select("id")
    .eq("employee_id", employeeId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  const orderedIds = (data ?? []).map((row) => String(row.id)).filter((id) => id !== itemId);
  const targetIndex = Math.min(Math.max(requestedPosition - 1, 0), orderedIds.length);
  orderedIds.splice(targetIndex, 0, itemId);

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase
        .from("employee_achievements")
        .update({ sort_order: index + 1 })
        .eq("id", id)
        .eq("employee_id", employeeId),
    ),
  );

  const reorderError = results.find((result) => result.error)?.error;
  if (reorderError) throw reorderError;
}
export async function updateEmployeeProfile(formData: FormData) {
  const employeeId = String(formData.get("employee_id") ?? ""), code = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "").trim(), roleTitle = String(formData.get("role_title") ?? "").trim();
  const specialty = String(formData.get("specialty") ?? "").trim(), about = String(formData.get("about") ?? "").trim();
  const height = String(formData.get("height") ?? "").trim(), race = String(formData.get("race") ?? "").trim(), sex = String(formData.get("sex") ?? "").trim();
  const positionTitle = String(formData.get("position_title") ?? "").trim(), honorTitle = String(formData.get("honor_title") ?? "").trim();
  const ageText = String(formData.get("age") ?? "").trim(), documentUrl = String(formData.get("document_url") ?? "").trim();
  const age = ageText ? Number(ageText) : null;
  const photo = formData.get("photo"), { supabase } = await requireManager(employeeId);
  if (!name || !roleTitle || !specialty || name.length > 80 || roleTitle.length > 80 || positionTitle.length > 80 || !honorTitles.has(honorTitle) || specialty.length > 160 || about.length > 3000 || height.length > 30 || race.length > 80 || !sexes.has(sex) || (age !== null && (!Number.isInteger(age) || age < 0 || age > 9999)) || (documentUrl && !/^https?:\/\//i.test(documentUrl))) redirect(`/funcionarios/${code}?erro=dados#editar`);
  let photoUrl: string | undefined;
  try { if (photo instanceof File && photo.size) photoUrl = (await uploadImage(employeeId, photo, "profile")) ?? undefined; }
  catch { redirect(`/funcionarios/${code}?erro=imagem#editar`); }
  const { error } = await supabase.from("employees").update({ name, role_title: roleTitle, position_title:positionTitle||null, honor_title:honorTitle||null, specialty, about, height:height||null, race:race||null, age, sex:sex||null, document_url:documentUrl||null, ...(photoUrl ? { photo_url: photoUrl } : {}), updated_at: new Date().toISOString() }).eq("id", employeeId);
  if (error) redirect(`/funcionarios/${code}?erro=salvar#editar`);
  revalidatePath(`/funcionarios/${code}`); revalidatePath("/funcionarios"); redirect(`/funcionarios/${code}?salvo=1`);
}

export async function updateEmployeeStatus(formData: FormData) {
  await requireRole(["admin"]);
  const employeeId = String(formData.get("employee_id") ?? "");
  const code = String(formData.get("code") ?? "");
  const employeeStatus = String(formData.get("employee_status") ?? "");
  const { supabase } = await requireManager(employeeId);

  if (!employeeStatuses.has(employeeStatus)) {
    redirect(`/funcionarios/${code}?erro=dados#status`);
  }

  const { error } = await supabase.from("employees").update({
    employee_status: employeeStatus,
    is_active: employeeStatus === "active",
    updated_at: new Date().toISOString(),
  }).eq("id", employeeId);

  if (error) redirect(`/funcionarios/${code}?erro=salvar#status`);

  revalidatePath(`/funcionarios/${code}`);
  revalidatePath("/funcionarios");
  revalidatePath("/adm/funcionarios");
  revalidatePath("/");
  redirect(`/funcionarios/${code}?salvo=1#status`);
}

export async function updateEmployeeMemorial(formData: FormData) {
  await requireRole(["admin"]);
  const employeeId = String(formData.get("employee_id") ?? "");
  const code = String(formData.get("code") ?? "");
  const mementoText = String(formData.get("memento_text") ?? "").trim();
  const mementoUrl = String(formData.get("memento_url") ?? "").trim();
  const mementoImage = formData.get("memento_image");
  const { supabase } = await requireManager(employeeId);
  const { data: employee } = await supabase
    .from("employees")
    .select("employee_status")
    .eq("id", employeeId)
    .maybeSingle<{ employee_status: string }>();

  if (
    employee?.employee_status !== "deceased" ||
    mementoText.length > 10000 ||
    (mementoUrl && !/^https?:\/\//i.test(mementoUrl))
  ) {
    redirect(`/funcionarios/${code}?erro=dados#memento-editor`);
  }

  const update: Record<string, unknown> = {
    memento_text: mementoText,
    memento_url: mementoUrl || null,
    updated_at: new Date().toISOString(),
  };

  try {
    if (mementoImage instanceof File && mementoImage.size) {
      update.memento_image_url = await uploadImage(employeeId, mementoImage, "memento");
    }
  } catch {
    redirect(`/funcionarios/${code}?erro=imagem#memento-editor`);
  }

  const { error } = await supabase.from("employees").update(update).eq("id", employeeId);
  if (error) redirect(`/funcionarios/${code}?erro=salvar#memento-editor`);

  revalidatePath(`/funcionarios/${code}`);
  revalidatePath("/funcionarios");
  redirect(`/funcionarios/${code}?salvo=1#memento-editor`);
}
export async function addEquipment(formData: FormData) {
  const employeeId = String(formData.get("employee_id") ?? ""), code = String(formData.get("code") ?? "");
  const name = String(formData.get("name") ?? "").trim(), itemType = String(formData.get("item_type") ?? "").trim(), description = String(formData.get("description") ?? "").trim();
  const rarity = String(formData.get("rarity") ?? "").trim();
  const position = Number(String(formData.get("sort_order") ?? ""));
  const documentUrl = String(formData.get("document_url") ?? "").trim();
  const image = formData.get("image"), { supabase } = await requireManager(employeeId);
  if (!name || !equipmentTypes.has(itemType) || !equipmentRarities.has(rarity) || !Number.isInteger(position) || position < 1 || position > 9999 || name.length > 100 || description.length > 1000 || (documentUrl && !/^https?:\/\//i.test(documentUrl))) redirect(`/funcionarios/${code}?erro=dados#editar`);
  let imageUrl: string | null = null;
  try { if (image instanceof File && image.size) imageUrl = await uploadImage(employeeId, image, "equipment"); }
  catch { redirect(`/funcionarios/${code}?erro=imagem#editar`); }
  const { data: inserted, error } = await supabase.from("employee_equipment").insert({ employee_id: employeeId, name, item_type: itemType, rarity, description, image_url: imageUrl, document_url: documentUrl || null, sort_order: position }).select("id").single<{ id: string }>();
  if (error || !inserted) redirect(`/funcionarios/${code}?erro=salvar#editar`);
  try { await reorderEquipment(supabase, employeeId, inserted.id, position); }
  catch { redirect(`/funcionarios/${code}?erro=salvar#editar`); }
  revalidatePath(`/funcionarios/${code}`); redirect(`/funcionarios/${code}?salvo=1#equipamentos`);
}
export async function addAchievement(formData: FormData) {
  await requireRole(["admin"]);
  const employeeId = String(formData.get("employee_id") ?? ""), code = String(formData.get("code") ?? "");
  const title = String(formData.get("title") ?? "").trim(), description = String(formData.get("description") ?? "").trim();
  const position = Number(String(formData.get("sort_order") ?? ""));
  const { supabase } = await requireManager(employeeId);
  if (!title || !Number.isInteger(position) || position < 1 || position > 9999 || title.length > 140 || description.length > 1000) redirect(`/funcionarios/${code}?erro=dados#editar`);
  const { data: inserted, error } = await supabase.from("employee_achievements").insert({ employee_id: employeeId, title, description, sort_order: position }).select("id").single<{ id: string }>();
  if (error || !inserted) redirect(`/funcionarios/${code}?erro=salvar#editar`);
  try { await reorderAchievements(supabase, employeeId, inserted.id, position); }
  catch { redirect(`/funcionarios/${code}?erro=salvar#editar`); }
  revalidatePath(`/funcionarios/${code}`); revalidatePath("/"); redirect(`/funcionarios/${code}?salvo=1#feitos`);
}

export async function updateEquipment(formData: FormData) {
  const employeeId = String(formData.get("employee_id") ?? ""), code = String(formData.get("code") ?? ""), itemId = String(formData.get("item_id") ?? "");
  const name = String(formData.get("name") ?? "").trim(), itemType = String(formData.get("item_type") ?? "").trim(), description = String(formData.get("description") ?? "").trim(), documentUrl = String(formData.get("document_url") ?? "").trim();
  const rarity = String(formData.get("rarity") ?? "").trim();
  const position = Number(String(formData.get("sort_order") ?? ""));
  const image = formData.get("image"), { supabase } = await requireManager(employeeId);
  if (!/^[0-9a-f-]{36}$/i.test(itemId) || !name || !equipmentTypes.has(itemType) || !equipmentRarities.has(rarity) || !Number.isInteger(position) || position < 1 || position > 9999 || name.length > 100 || description.length > 1000 || (documentUrl && !/^https?:\/\//i.test(documentUrl))) redirect(`/funcionarios/${code}?erro=dados#equipamentos`);
  const update: Record<string, unknown> = { name, item_type: itemType, rarity, description, document_url: documentUrl || null };
  try { if (image instanceof File && image.size) update.image_url = await uploadImage(employeeId, image, "equipment"); }
  catch { redirect(`/funcionarios/${code}?erro=imagem#equipamentos`); }
  const { error } = await supabase.from("employee_equipment").update(update).eq("id", itemId).eq("employee_id", employeeId);
  if (error) redirect(`/funcionarios/${code}?erro=salvar#equipamentos`);
  try { await reorderEquipment(supabase, employeeId, itemId, position); }
  catch { redirect(`/funcionarios/${code}?erro=salvar#equipamentos`); }
  revalidatePath(`/funcionarios/${code}`); redirect(`/funcionarios/${code}?salvo=1#equipamentos`);
}

export async function updateAchievement(formData: FormData) {
  await requireRole(["admin"]);
  const employeeId = String(formData.get("employee_id") ?? ""), code = String(formData.get("code") ?? ""), itemId = String(formData.get("item_id") ?? "");
  const title = String(formData.get("title") ?? "").trim(), description = String(formData.get("description") ?? "").trim();
  const position = Number(String(formData.get("sort_order") ?? ""));
  const { supabase } = await requireManager(employeeId);
  if (!/^[0-9a-f-]{36}$/i.test(itemId) || !title || !Number.isInteger(position) || position < 1 || position > 9999 || title.length > 140 || description.length > 1000) redirect(`/funcionarios/${code}?erro=dados#feitos`);
  const { error } = await supabase.from("employee_achievements").update({ title, description }).eq("id", itemId).eq("employee_id", employeeId);
  if (error) redirect(`/funcionarios/${code}?erro=salvar#feitos`);
  try { await reorderAchievements(supabase, employeeId, itemId, position); }
  catch { redirect(`/funcionarios/${code}?erro=salvar#feitos`); }
  revalidatePath(`/funcionarios/${code}`); revalidatePath("/"); redirect(`/funcionarios/${code}?salvo=1#feitos`);
}
export async function removeEmployeeItem(formData: FormData) {
  const employeeId = String(formData.get("employee_id") ?? ""), code = String(formData.get("code") ?? ""), itemId = String(formData.get("item_id") ?? ""), kind = String(formData.get("kind") ?? "");
  if (kind === "achievement") await requireRole(["admin"]);
  const { supabase } = await requireManager(employeeId);
  const table = kind === "equipment" ? "employee_equipment" : kind === "achievement" ? "employee_achievements" : null;
  if (!table) redirect(`/funcionarios/${code}?erro=dados#editar`);
  const { error } = await supabase.from(table).delete().eq("id", itemId).eq("employee_id", employeeId);
  if (error) redirect(`/funcionarios/${code}?erro=salvar#editar`);
  revalidatePath(`/funcionarios/${code}`); if (kind === "achievement") revalidatePath("/"); redirect(`/funcionarios/${code}?salvo=1`);
}
