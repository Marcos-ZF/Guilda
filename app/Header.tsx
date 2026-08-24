import { getCurrentProfile } from "@/lib/auth";
import { getSaoPauloDateKey, VISITOR_ACCESS_COOKIE } from "@/lib/session";
import { cookies } from "next/headers";
import { connection } from "next/server";
import HeaderClient from "./HeaderClient";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  await connection();
  const profile = await getCurrentProfile();
  const cookieStore = await cookies();
  const isVisitor =
    !profile &&
    cookieStore.get(VISITOR_ACCESS_COOKIE)?.value === getSaoPauloDateKey();
  let photoUrl: string | null = null;
  if (profile) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", profile.id)
      .maybeSingle<{ avatar_url: string | null }>();
    photoUrl = data?.avatar_url ?? null;
  }

  return (
    <HeaderClient
      profile={profile}
      photoUrl={photoUrl}
      isVisitor={isVisitor}
    />
  );
}
