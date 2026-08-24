export const AUTH_SESSION_MAX_AGE_SECONDS = 4 * 60 * 60;
export const VISITOR_ACCESS_COOKIE = "romanov-visitor-access";
export const SESSION_DEADLINE_COOKIE = "romanov-session-deadline";
export const SESSION_LOGIN_DAY_COOKIE = "romanov-session-day";
export const LOGIN_BOOT_PASS_COOKIE = "romanov-login-boot-pass";

export function getSaoPauloDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

export const sharedCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
