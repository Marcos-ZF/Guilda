import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  SESSION_DEADLINE_COOKIE,
  SESSION_LOGIN_DAY_COOKIE,
  VISITOR_ACCESS_COOKIE,
} from "@/lib/session";

export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  }

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_DEADLINE_COOKIE);
  cookieStore.delete(SESSION_LOGIN_DAY_COOKIE);
  cookieStore.delete(VISITOR_ACCESS_COOKIE);

  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
