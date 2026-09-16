"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { canEditCreature, parseCreature, uuidPattern } from "./model";

export type SaveState = { error: string };
const mimeExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export async function saveCreature(_state: SaveState, form: FormData): Promise<SaveState> {
  const profile = await requireRole(["funcionario", "admin"]);
  const supabase = await createClient();
  const id = String(form.get("id") ?? "");
  if (id && !uuidPattern.test(id)) return { error: "Registro inválido." };
  let oldPath: string | null = null;
  if (id) {
    const { data, error } = await supabase.from("bestiary_creatures").select("created_by,image_path").eq("id", id).maybeSingle();
    if (error || !data || !canEditCreature(profile, data)) return { error: "Você não tem permissão para editar esta criatura." };
    oldPath = data.image_path;
  }
  const input = parseCreature(form);
  if (!input) return { error: "Confira nome, categoria, ameaça e habilidades. Cada habilidade precisa de um nome." };
  if (input.discoverer_employee_id) {
    const { data, error } = await supabase.from("employees").select("id").eq("id", input.discoverer_employee_id).maybeSingle();
    if (error || !data) return { error: "O responsável selecionado não foi encontrado." };
  }
  const file = form.get("image");
  const hasImage = file instanceof File && file.size > 0;
  if (!id && !hasImage) return { error: "Escolha e aplique uma foto para a criatura." };
  if (hasImage && (file.size > 5 * 1024 * 1024 || !mimeExtensions[file.type])) return { error: "Use uma imagem JPG, PNG, WEBP ou GIF de até 5 MB." };
  let newPath: string | null = null;
  if (hasImage) {
    newPath = `${profile.id}/${crypto.randomUUID()}.${mimeExtensions[file.type]}`;
    const { error } = await supabase.storage.from("bestiary-media").upload(newPath, file, { contentType: file.type, upsert: false });
    if (error) return { error: "Não foi possível enviar a foto. Verifique se o SQL do Bestiário foi aplicado." };
  }
  const recordId = id || crypto.randomUUID();
  const payload = { ...input, image_path: newPath ?? oldPath!, updated_by: profile.id, updated_at: new Date().toISOString() };
  const result = id
    ? await supabase.from("bestiary_creatures").update(payload).eq("id", id).select("id").maybeSingle()
    : await supabase.from("bestiary_creatures").insert({ ...payload, id: recordId, created_by: profile.id }).select("id").single();
  if (result.error || !result.data) {
    if (newPath) await supabase.storage.from("bestiary-media").remove([newPath]);
    return { error: "Não foi possível salvar. Seus dados continuam no formulário. Confira suas permissões e tente novamente." };
  }
  if (newPath && oldPath) await supabase.storage.from("bestiary-media").remove([oldPath]);
  revalidatePath("/bestiario");
  revalidatePath(`/bestiario/${recordId}`);
  redirect(`/bestiario/${recordId}?salvo=1`);
}

export async function deleteCreature(form: FormData) {
  await requireRole(["admin"]);
  const id = String(form.get("id") ?? "");
  if (!uuidPattern.test(id)) redirect("/bestiario?erro=excluir");
  const supabase = await createClient();
  const { data, error } = await supabase.from("bestiary_creatures").delete().eq("id", id).select("image_path").maybeSingle();
  if (error || !data) redirect("/bestiario?erro=excluir");
  await supabase.storage.from("bestiary-media").remove([data.image_path]);
  revalidatePath("/bestiario");
  revalidatePath(`/bestiario/${id}`);
  redirect("/bestiario?excluido=1");
}
