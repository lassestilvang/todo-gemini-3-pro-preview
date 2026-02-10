import { describe, it, expect } from "bun:test";
import { normalizeIp, getClientIp } from "./ip-utils";

describe("normalizeIp", () => {
  it("returns null for null", () => {
    expect(normalizeIp(null)).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(normalizeIp(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeIp("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normalizeIp("   ")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(normalizeIp("  128.76.228.251  ")).toBe("128.76.228.251");
  });

  it("takes the first IP from comma-separated list", () => {
    expect(normalizeIp("10.0.0.1, 192.168.1.1")).toBe("10.0.0.1");
  });

  it("strips ::ffff: prefix (IPv4-mapped IPv6)", () => {
    expect(normalizeIp("::ffff:128.76.228.251")).toBe("128.76.228.251");
  });

  it("strips port from IPv4:port format", () => {
    expect(normalizeIp("128.76.228.251:8080")).toBe("128.76.228.251");
  });

  it("passes through a plain IPv4 address", () => {
    expect(normalizeIp("192.168.0.1")).toBe("192.168.0.1");
  });

  it("passes through a plain IPv6 address", () => {
    expect(normalizeIp("2001:db8::1")).toBe("2001:db8::1");
  });
});

describe("getClientIp", () => {
  it("prioritizes x-vercel-ip over x-real-ip and x-forwarded-for", () => {
    const headers = new Headers();
    headers.set("x-vercel-ip", "10.0.0.1");
    headers.set("x-real-ip", "10.0.0.2");
    headers.set("x-forwarded-for", "10.0.0.3");

    expect(getClientIp(headers)).toBe("10.0.0.1");
  });

  it("prioritizes x-real-ip over x-forwarded-for", () => {
    const headers = new Headers();
    headers.set("x-real-ip", "10.0.0.2");
    headers.set("x-forwarded-for", "10.0.0.3");

    expect(getClientIp(headers)).toBe("10.0.0.2");
  });

  it("falls back to x-forwarded-for", () => {
    const headers = new Headers();
    headers.set("x-forwarded-for", "10.0.0.3");

    expect(getClientIp(headers)).toBe("10.0.0.3");
  });

  it("handles comma-separated x-forwarded-for (standard behavior)", () => {
    const headers = new Headers();
    headers.set("x-forwarded-for", "10.0.0.3, 10.0.0.4");

    // Note: getClientIp uses normalizeIp which takes the first IP.
    // This confirms the fallback behavior is consistent with normalizeIp.
    expect(getClientIp(headers)).toBe("10.0.0.3");
  });

  it("handles spoofing attempt where attacker sends x-forwarded-for and platform sets x-real-ip", () => {
    const headers = new Headers();
    // Attacker sends: X-Forwarded-For: spoofed
    // Platform appends: X-Forwarded-For: spoofed, real
    // Platform sets: X-Real-IP: real

    headers.set("x-forwarded-for", "spoofed-ip, real-ip");
    headers.set("x-real-ip", "real-ip");

    // Should return real-ip, ignoring the spoofed one in XFF
    expect(getClientIp(headers)).toBe("real-ip");
  });
});
