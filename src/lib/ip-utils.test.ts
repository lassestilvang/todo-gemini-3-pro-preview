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
  it("prioritizes x-vercel-forwarded-for", () => {
    const headers = new Headers();
    headers.set("x-vercel-forwarded-for", "1.1.1.1");
    headers.set("x-real-ip", "2.2.2.2");
    headers.set("x-client-ip", "3.3.3.3");
    headers.set("x-forwarded-for", "4.4.4.4");
    expect(getClientIp(headers)).toBe("1.1.1.1");
  });

  it("falls back to x-real-ip if vercel header missing", () => {
    const headers = new Headers();
    headers.set("x-real-ip", "2.2.2.2");
    headers.set("x-client-ip", "3.3.3.3");
    headers.set("x-forwarded-for", "4.4.4.4");
    expect(getClientIp(headers)).toBe("2.2.2.2");
  });

  it("falls back to x-client-ip if real ip missing", () => {
    const headers = new Headers();
    headers.set("x-client-ip", "3.3.3.3");
    headers.set("x-forwarded-for", "4.4.4.4");
    expect(getClientIp(headers)).toBe("3.3.3.3");
  });

  it("falls back to x-forwarded-for if others missing", () => {
    const headers = new Headers();
    headers.set("x-forwarded-for", "4.4.4.4");
    expect(getClientIp(headers)).toBe("4.4.4.4");
  });

  it("handles x-forwarded-for with multiple IPs (takes first)", () => {
    const headers = new Headers();
    headers.set("x-forwarded-for", "4.4.4.4, 5.5.5.5");
    expect(getClientIp(headers)).toBe("4.4.4.4");
  });

  it("returns null if no headers present", () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBeNull();
  });
});
