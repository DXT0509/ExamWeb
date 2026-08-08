import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const GUEST_COOKIE_NAME = "guest_exam_token";
const GUEST_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Hashes a raw guest token using SHA-256.
 * The hash is what gets saved into database guest_session_hash.
 */
export function hashGuestToken(token: string): string {
  return createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Generates a cryptographically strong raw guest token (64 hex characters).
 */
export function generateGuestToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Retrieves the raw guest token from httpOnly cookie (server context).
 */
export async function getGuestTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(GUEST_COOKIE_NAME)?.value;
  return token && token.length === 64 ? token : null;
}

/**
 * Retrieves the hashed guest token from cookie if present.
 */
export async function getGuestSessionHash(): Promise<string | null> {
  const token = await getGuestTokenFromCookie();
  return token ? hashGuestToken(token) : null;
}

/**
 * Sets or refreshes the guest token cookie. Returns the raw token.
 */
export async function ensureGuestSessionToken(): Promise<{ token: string; hash: string }> {
  const cookieStore = await cookies();
  let token = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  if (!token || token.length !== 64) {
    token = generateGuestToken();
    cookieStore.set(GUEST_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: GUEST_COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return {
    token,
    hash: hashGuestToken(token),
  };
}
