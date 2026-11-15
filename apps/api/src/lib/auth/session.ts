import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");
export const isSessionToken = (token: string | null): token is string => /^[a-f0-9]{64}$/.test(token ?? "");

export function newSession(now: Date) {
  const token = randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token), expiresAt: new Date(now.getTime() + SESSION_SECONDS * 1000) };
}

export function sessionCookieName(): string {
  return process.env.NODE_ENV === "production" ? "__Host-portal_session" : "portal_session";
}

export function readSessionToken(request: Request): string | null {
  const values = (request.headers.get("cookie") ?? "").split(";")
    .map((part) => part.trim().split("="))
    .filter(([name]) => name === sessionCookieName());
  return values.length === 1 && values[0].length === 2 && isSessionToken(values[0][1] ?? null) ? values[0][1] : null;
}

export function setSessionCookie(response: Response, token: string | null): Response {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const expiry = token ? `Max-Age=${SESSION_SECONDS}` : "Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  response.headers.append("Set-Cookie", `${sessionCookieName()}=${token ?? ""}; Path=/; HttpOnly; SameSite=Lax; ${expiry}${secure}`);
  return response;
}
