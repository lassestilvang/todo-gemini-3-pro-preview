export function normalizeIp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  let ip = value.trim();
  if (!ip) {
    return null;
  }

  // Handle comma-separated lists (e.g. from X-Forwarded-For)
  // We take the first IP, but getClientIp ensures we prefer specific headers first.
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

/**
 * robustly determines the client IP address from request headers.
 * Prioritizes platform-specific headers (Vercel, etc.) over X-Forwarded-For
 * to prevent IP spoofing attacks where the client appends a fake IP.
 */
export function getClientIp(headers: Headers): string | null {
  // Defensive check for mock objects or invalid headers
  if (!headers || typeof headers.get !== 'function') {
    return null;
  }

  // Vercel / Edge platform headers - reliable and set by the edge
  const vercelIp = headers.get("x-vercel-ip");
  if (vercelIp) return normalizeIp(vercelIp);

  // Standard real IP header (often set by Nginx/proxies)
  const realIp = headers.get("x-real-ip");
  if (realIp) return normalizeIp(realIp);

  // Fallback to X-Forwarded-For
  // Note: This is vulnerable to spoofing if the edge doesn't overwrite/append correctly,
  // but it's the standard fallback.
  const xff = headers.get("x-forwarded-for");
  return normalizeIp(xff);
}
