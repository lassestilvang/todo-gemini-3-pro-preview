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

/**
 * Extracts the client IP address from request headers, prioritizing secure headers.
 *
 * Priority:
 * 1. x-vercel-forwarded-for (Vercel specific, trusted)
 * 2. x-real-ip (Nginx/load balancers, usually trusted)
 * 3. x-client-ip (Standard)
 * 4. x-forwarded-for (Standard but spoofable if not careful)
 */
export function getClientIp(headers: Headers): string | null {
  const vercelForwardedFor = headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    return normalizeIp(vercelForwardedFor);
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return normalizeIp(realIp);
  }

  const clientIp = headers.get("x-client-ip");
  if (clientIp) {
    return normalizeIp(clientIp);
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return normalizeIp(forwardedFor);
  }

  return null;
}
