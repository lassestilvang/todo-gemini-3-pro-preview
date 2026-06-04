/**
 * Normalizes an IP address by removing IPv6 mapping prefix and handling ports.
 */
export function normalizeIp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  let ip = value.trim();
  if (!ip) {
    return null;
  }

  if (ip.includes(",")) {
    ip = ip.split(",")[0]?.trim() ?? "";
  }

  if (ip.startsWith("::ffff:")) {
    ip = ip.slice(7);
  }

  if (ip.includes(".") && ip.includes(":")) {
    const lastColon = ip.lastIndexOf(":");
    const port = ip.slice(lastColon + 1);
    if (/^\d+$/.test(port)) {
      ip = ip.slice(0, lastColon);
    }
  }

  return ip || null;
}

interface HeaderStore {
  get(name: string): string | null;
}

/**
 * Extracts the client IP address from request headers, prioritizing secure headers.
 *
 * Priority:
 * 1. x-vercel-ip (Vercel/Edge specific, set by platform)
 * 2. x-vercel-forwarded-for (Vercel specific, trusted)
 */
export function getClientIp(headers: HeaderStore | null | undefined): string | null {
  if (!headers || typeof headers.get !== "function") {
    return null;
  }

  const vercelIp = headers.get("x-vercel-ip");
  if (vercelIp) {
    return normalizeIp(vercelIp);
  }

  const vercelForwardedFor = headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    return normalizeIp(vercelForwardedFor);
  }

  return null;
}
