import { NextResponse } from "next/server";
import {
  LOGIN_BOOT_PASS_COOKIE,
  sharedCookieOptions,
} from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ready: true });
  response.cookies.set(LOGIN_BOOT_PASS_COOKIE, "1", {
    ...sharedCookieOptions,
    httpOnly: true,
    maxAge: 60,
  });

  return response;
}
