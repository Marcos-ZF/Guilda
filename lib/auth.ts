import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "funcionario" | "admin";

export type CurrentProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  employee_id: string | null;
};

/** Retorna o perfil atual quando houver sessão, sem exigir login. */
export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, employee_id")
    .eq("id", userId)
    .maybeSingle<CurrentProfile>();

  if (
    profileError ||
    !profile ||
    !["funcionario", "admin"].includes(profile.role)
  ) {
    return null;
  }

  return profile;
});

/**
 * Confirma a sessão no servidor e consulta o cargo diretamente na tabela
 * profiles. Nunca use informações enviadas pelo navegador para autorizar uma
 * página privada.
 */
export async function requireRole(
  allowedRoles: UserRole[],
): Promise<CurrentProfile> {
  await connection();
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect("/?erro=sem-permissao");
  }

  return profile;
}
