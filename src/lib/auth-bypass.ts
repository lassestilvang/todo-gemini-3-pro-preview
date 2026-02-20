import { normalizeIp } from "./ip-utils";

export const AUTH_BYPASS_HEADER = "x-auth-bypass";
export const AUTH_BYPASS_SIGNATURE_HEADER = "x-auth-bypass-signature";

// Re-export normalizeIp for backward compatibility or existing imports
export { normalizeIp };

export type BypassUserConfig = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
};

export function isDevBypassEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function getDevBypassUserConfig(): BypassUserConfig {
  return {
    userId: process.env.DEV_AUTH_BYPASS_USER_ID ?? "dev_user",
    email: process.env.DEV_AUTH_BYPASS_EMAIL ?? "dev@local",
    firstName: process.env.DEV_AUTH_BYPASS_FIRST_NAME ?? "Dev",
    lastName: process.env.DEV_AUTH_BYPASS_LAST_NAME ?? "User",
    avatarUrl: process.env.DEV_AUTH_BYPASS_AVATAR_URL ?? null,
  };
}

export function getProdBypassUserConfig(): BypassUserConfig | null {
  const userId = process.env.AUTH_BYPASS_USER_ID;
  const email = process.env.AUTH_BYPASS_EMAIL;

  if (!userId || !email) {
    return null;
  }

  return {
    userId,
    email,
    firstName: process.env.AUTH_BYPASS_FIRST_NAME ?? null,
    lastName: process.env.AUTH_BYPASS_LAST_NAME ?? null,
    avatarUrl: process.env.AUTH_BYPASS_AVATAR_URL ?? null,
  };
}

export function getAuthBypassSecret(): string | null {
  return process.env.AUTH_BYPASS_SECRET ?? null;
}

export function getAuthBypassIpAllowlist(): string[] {
  const raw = process.env.AUTH_BYPASS_IPS ?? "";
  return raw
    .split(/[\s,]+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function signAuthBypassPayload(
  payload: string,
  secret: string
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is not available for auth bypass signing.");
  }

  const encoder = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );

  return toHex(signature);
}

export function constantTimeEqual(a: string, b: string): boolean {
  const aLen = a.length;
  const bLen = b.length;
  const len = Math.max(aLen, bLen);
  let result = 0;

  for (let i = 0; i < len; i++) {
    const charA = i < aLen ? a.charCodeAt(i) : 0;
    const charB = i < bLen ? b.charCodeAt(i) : 0;
    result |= charA ^ charB;
  }

  result |= aLen ^ bLen;
  return result === 0;
}

export async function verifyAuthBypassSignature(
  payload: string,
  secret: string,
  signature: string
): Promise<boolean> {
  try {
    const expected = await signAuthBypassPayload(payload, secret);
    return constantTimeEqual(expected, signature.trim().toLowerCase());
  } catch {
    return false;
  }
}
