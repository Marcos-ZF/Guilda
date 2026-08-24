import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSaoPauloDateKey,
  LOGIN_BOOT_PASS_COOKIE,
  SESSION_DEADLINE_COOKIE,
  SESSION_LOGIN_DAY_COOKIE,
  sharedCookieOptions,
  VISITOR_ACCESS_COOKIE,
} from "@/lib/session";

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

function loginRedirect(
  request: NextRequest,
  response: NextResponse,
  reason?: "sessao",
) {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";

  if (reason) loginUrl.searchParams.set("erro", reason);
  if (request.nextUrl.pathname !== "/") {
    loginUrl.searchParams.set(
      "retorno",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
  }

  return copyCookies(response, NextResponse.redirect(loginUrl));
}

function clearLocalAccess(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach(({ name }) => {
    if (name.startsWith("sb-")) response.cookies.delete(name);
  });
  response.cookies.delete(SESSION_DEADLINE_COOKIE);
  response.cookies.delete(SESSION_LOGIN_DAY_COOKIE);
  response.cookies.delete(VISITOR_ACCESS_COOKIE);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const isBootRoute = path === "/inicializacao";
  const isLoginRoute = path === "/login";
  const isLoginPageNavigation =
    isLoginRoute && (request.method === "GET" || request.method === "HEAD");
  const loginError = request.nextUrl.searchParams.get("erro");
  const isLoginFormRetry =
    isLoginPageNavigation &&
    ["campos", "configuracao", "credenciais", "perfil"].includes(
      loginError ?? "",
    );
  const hasBootCompletionMarker =
    request.nextUrl.searchParams.get("vivianos") === "pronto";
  const hasLoginBootPass =
    request.cookies.get(LOGIN_BOOT_PASS_COOKIE)?.value === "1";
  const isAuthRoute = path.startsWith("/auth/");
  const isProtectedRoute =
    path.startsWith("/relatorios") ||
    path.startsWith("/adm") ||
    path.startsWith("/perfil");
  const hasVisitorAccess =
    request.cookies.get(VISITOR_ACCESS_COOKIE)?.value === getSaoPauloDateKey();

  if (isLoginPageNavigation && hasBootCompletionMarker) {
    const cleanLoginUrl = request.nextUrl.clone();
    cleanLoginUrl.searchParams.delete("vivianos");
    const bootCompletedResponse = NextResponse.redirect(cleanLoginUrl);
    bootCompletedResponse.cookies.set(LOGIN_BOOT_PASS_COOKIE, "1", {
      ...sharedCookieOptions,
      httpOnly: true,
      maxAge: 60,
    });
    return bootCompletedResponse;
  }

  if (isLoginPageNavigation && !hasLoginBootPass && !isLoginFormRetry) {
    const bootUrl = request.nextUrl.clone();
    bootUrl.pathname = "/inicializacao";
    bootUrl.search = "";
    bootUrl.searchParams.set(
      "retorno",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return NextResponse.redirect(bootUrl);
  }

  if (isBootRoute) {
    return response;
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    if (isProtectedRoute || (!hasVisitorAccess && !isLoginRoute && !isAuthRoute)) {
      return loginRedirect(request, response);
    }
    if (isLoginRoute) response.cookies.delete(LOGIN_BOOT_PASS_COOKIE);
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    },
  );

  // Valida e renova a sessão quando houver um cookie de autenticação.
  const { data } = await supabase.auth.getClaims();
  const hasSession = Boolean(data?.claims);

  if (hasSession) {
    const isSessionFromToday =
      request.cookies.get(SESSION_LOGIN_DAY_COOKIE)?.value ===
      getSaoPauloDateKey();

    if (!isSessionFromToday) {
      await supabase.auth.signOut({ scope: "local" });
      const expiredResponse = loginRedirect(request, response, "sessao");
      clearLocalAccess(request, expiredResponse);
      return expiredResponse;
    }

    const { data: expiresAt, error: expirationError } = await supabase.rpc(
      "current_session_expires_at",
    );
    const deadline = typeof expiresAt === "string" ? Date.parse(expiresAt) : NaN;

    if (expirationError || !Number.isFinite(deadline) || deadline <= Date.now()) {
      await supabase.auth.signOut({ scope: "local" });
      const expiredResponse = loginRedirect(request, response, "sessao");
      clearLocalAccess(request, expiredResponse);
      return expiredResponse;
    }

    response.cookies.delete(VISITOR_ACCESS_COOKIE);
    response.cookies.set(SESSION_DEADLINE_COOKIE, String(deadline), {
      ...sharedCookieOptions,
      httpOnly: false,
      maxAge: Math.max(1, Math.ceil((deadline - Date.now()) / 1000)),
    });

    if (isLoginRoute) {
      const homeResponse = copyCookies(
        response,
        NextResponse.redirect(new URL("/", request.url)),
      );
      homeResponse.cookies.delete(LOGIN_BOOT_PASS_COOKIE);
      return homeResponse;
    }

    return response;
  }

  response.cookies.delete(SESSION_DEADLINE_COOKIE);
  response.cookies.delete(SESSION_LOGIN_DAY_COOKIE);

  if (isProtectedRoute) {
    return loginRedirect(request, response);
  }

  if (!hasVisitorAccess && !isLoginRoute && !isAuthRoute) {
    return loginRedirect(request, response);
  }

  if (isLoginRoute) response.cookies.delete(LOGIN_BOOT_PASS_COOKIE);
  return response;
}
