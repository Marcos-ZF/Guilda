"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export async function updateOwnAccount(formData: FormData) {
  const profile = await requireRole(["funcionario", "admin"]);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const avatar = formData.get("avatar");

  if (
    !/^\S+@\S+\.\S+$/.test(email) ||
    displayName.length > 80 ||
    (password && password.length < 8)
  ) {
    redirect("/perfil?erro=dados");
  }

  const supabase = await createClient();
  let avatarUrl: string | undefined;

  if (avatar instanceof File && avatar.size > 0) {
    if (avatar.size > 5 * 1024 * 1024 || !ALLOWED_IMAGE_TYPES.has(avatar.type)) {
      redirect("/perfil?erro=imagem");
    }

    const imagePath = `${profile.id}/avatar-${Date.now()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from("profile-media")
      .upload(imagePath, avatar, {
        cacheControl: "3600",
        contentType: avatar.type,
        upsert: false,
      });

    if (uploadError) {
      redirect("/perfil?erro=imagem");
    }

    avatarUrl = supabase.storage.from("profile-media").getPublicUrl(imagePath)
      .data.publicUrl;
  }

  const { error: authError } = await supabase.auth.updateUser({
    email,
    ...(password ? { password } : {}),
  });

  if (authError) {
    redirect("/perfil?erro=auth");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      email,
      display_name: displayName || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) {
    redirect("/perfil?erro=salvar");
  }

  revalidatePath("/");
  revalidatePath("/perfil");
  redirect("/perfil?salvo=1");
}
