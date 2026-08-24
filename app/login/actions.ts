"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  AUTH_SESSION_MAX_AGE_SECONDS,
  getSaoPauloDateKey,
  SESSION_DEADLINE_COOKIE,
  SESSION_LOGIN_DAY_COOKIE,
  sharedCookieOptions,
  VISITOR_ACCESS_COOKIE,
} from "@/lib/session";

export async function login(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/login?erro=campos");
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    redirect("/login?erro=configuracao");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?erro=credenciais");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single<{ role: "funcionario" | "admin" }>();

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login?erro=perfil");
  }

  const cookieStore = await cookies();
  cookieStore.delete(VISITOR_ACCESS_COOKIE);
  cookieStore.set(SESSION_LOGIN_DAY_COOKIE, getSaoPauloDateKey(), {
    ...sharedCookieOptions,
    httpOnly: true,
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  });
  cookieStore.set(
    SESSION_DEADLINE_COOKIE,
    String(Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000),
    {
      ...sharedCookieOptions,
      httpOnly: false,
      maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    },
  );

  redirect("/");
}

export async function enterAsVisitor() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_DEADLINE_COOKIE);
  cookieStore.delete(SESSION_LOGIN_DAY_COOKIE);
  cookieStore.set(VISITOR_ACCESS_COOKIE, getSaoPauloDateKey(), {
    ...sharedCookieOptions,
    httpOnly: true,
    maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
  });

  redirect("/");
}
