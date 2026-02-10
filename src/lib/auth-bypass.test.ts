import { describe, it, expect, afterEach } from "bun:test";
import {
  getAuthBypassIpAllowlist,
  getAuthBypassSecret,
  getDevBypassUserConfig,
  getProdBypassUserConfig,
  isDevBypassEnabled,
  signAuthBypassPayload,
  verifyAuthBypassSignature,
  constantTimeEqual,
} from "./auth-bypass";

function setEnv(key: string, value: string) {
  process.env[key] = value;
}

function clearEnv(key: string) {
  delete process.env[key];
}

describe("getAuthBypassIpAllowlist", () => {
  const key = "AUTH_BYPASS_IPS";

  afterEach(() => clearEnv(key));

  it("returns empty array when env var is unset", () => {
    clearEnv(key);
    expect(getAuthBypassIpAllowlist()).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    setEnv(key, "");
    expect(getAuthBypassIpAllowlist()).toEqual([]);
  });

  it("parses a single IP", () => {
    setEnv(key, "128.76.228.251");
    expect(getAuthBypassIpAllowlist()).toEqual(["128.76.228.251"]);
  });

  it("parses comma-separated IPs", () => {
    setEnv(key, "10.0.0.1,192.168.1.1,128.76.228.251");
    expect(getAuthBypassIpAllowlist()).toEqual(["10.0.0.1", "192.168.1.1", "128.76.228.251"]);
  });

  it("parses whitespace-separated IPs", () => {
    setEnv(key, "10.0.0.1 192.168.1.1");
    expect(getAuthBypassIpAllowlist()).toEqual(["10.0.0.1", "192.168.1.1"]);
  });

  it("handles mixed delimiters and extra whitespace", () => {
    setEnv(key, "  10.0.0.1 , 192.168.1.1 ,, 128.76.228.251  ");
    expect(getAuthBypassIpAllowlist()).toEqual(["10.0.0.1", "192.168.1.1", "128.76.228.251"]);
  });

  it("filters out empty entries from trailing commas", () => {
    setEnv(key, "10.0.0.1,,,");
    expect(getAuthBypassIpAllowlist()).toEqual(["10.0.0.1"]);
  });
});

describe("signAuthBypassPayload + verifyAuthBypassSignature", () => {
  const secret = "test-secret-key-that-is-long-enough-32bytes!";
  const payload = "test_user_id";

  it("produces a valid hex string", async () => {
    const sig = await signAuthBypassPayload(payload, secret);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces deterministic output", async () => {
    const sig1 = await signAuthBypassPayload(payload, secret);
    const sig2 = await signAuthBypassPayload(payload, secret);
    expect(sig1).toBe(sig2);
  });

  it("produces different signatures for different payloads", async () => {
    const sig1 = await signAuthBypassPayload("user_a", secret);
    const sig2 = await signAuthBypassPayload("user_b", secret);
    expect(sig1).not.toBe(sig2);
  });

  it("produces different signatures for different secrets", async () => {
    const sig1 = await signAuthBypassPayload(payload, "secret-one-aaaaaaaaaaaaaaaa");
    const sig2 = await signAuthBypassPayload(payload, "secret-two-bbbbbbbbbbbbbbbb");
    expect(sig1).not.toBe(sig2);
  });

  it("verifies a correct signature", async () => {
    const sig = await signAuthBypassPayload(payload, secret);
    expect(await verifyAuthBypassSignature(payload, secret, sig)).toBe(true);
  });

  it("rejects a wrong signature", async () => {
    expect(await verifyAuthBypassSignature(payload, secret, "badbadbadbad")).toBe(false);
  });

  it("rejects an empty signature", async () => {
    expect(await verifyAuthBypassSignature(payload, secret, "")).toBe(false);
  });

  it("rejects a signature from a different secret", async () => {
    const sig = await signAuthBypassPayload(payload, "wrong-secret-aaaaaaaaaaaaaa");
    expect(await verifyAuthBypassSignature(payload, secret, sig)).toBe(false);
  });

  it("accepts signature with surrounding whitespace (trimmed)", async () => {
    const sig = await signAuthBypassPayload(payload, secret);
    expect(await verifyAuthBypassSignature(payload, secret, `  ${sig}  `)).toBe(true);
  });

  it("accepts uppercase hex signature (case-insensitive)", async () => {
    const sig = await signAuthBypassPayload(payload, secret);
    expect(await verifyAuthBypassSignature(payload, secret, sig.toUpperCase())).toBe(true);
  });
});

describe("constantTimeEqual", () => {
  it("returns true for identical strings", () => {
    expect(constantTimeEqual("abc", "abc")).toBe(true);
  });

  it("returns false for different strings of same length", () => {
    expect(constantTimeEqual("abc", "abd")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
  });

  it("returns true for empty strings", () => {
    expect(constantTimeEqual("", "")).toBe(true);
  });

  it("returns false when one is empty", () => {
    expect(constantTimeEqual("a", "")).toBe(false);
  });

  it("handles long hex strings", () => {
    const a = "a".repeat(64);
    const b = "a".repeat(63) + "b";
    expect(constantTimeEqual(a, a)).toBe(true);
    expect(constantTimeEqual(a, b)).toBe(false);
  });
});

describe("getProdBypassUserConfig", () => {
  afterEach(() => {
    clearEnv("AUTH_BYPASS_USER_ID");
    clearEnv("AUTH_BYPASS_EMAIL");
    clearEnv("AUTH_BYPASS_FIRST_NAME");
  });

  it("returns null when userId is missing", () => {
    clearEnv("AUTH_BYPASS_USER_ID");
    setEnv("AUTH_BYPASS_EMAIL", "test@example.com");
    expect(getProdBypassUserConfig()).toBeNull();
  });

  it("returns null when email is missing", () => {
    setEnv("AUTH_BYPASS_USER_ID", "user_1");
    clearEnv("AUTH_BYPASS_EMAIL");
    expect(getProdBypassUserConfig()).toBeNull();
  });

  it("returns null when both are missing", () => {
    clearEnv("AUTH_BYPASS_USER_ID");
    clearEnv("AUTH_BYPASS_EMAIL");
    expect(getProdBypassUserConfig()).toBeNull();
  });

  it("returns config when both userId and email are set", () => {
    setEnv("AUTH_BYPASS_USER_ID", "user_1");
    setEnv("AUTH_BYPASS_EMAIL", "test@example.com");
    const config = getProdBypassUserConfig();
    expect(config).not.toBeNull();
    expect(config!.userId).toBe("user_1");
    expect(config!.email).toBe("test@example.com");
  });
});

describe("getAuthBypassSecret", () => {
  afterEach(() => clearEnv("AUTH_BYPASS_SECRET"));

  it("returns null when unset", () => {
    clearEnv("AUTH_BYPASS_SECRET");
    expect(getAuthBypassSecret()).toBeNull();
  });

  it("returns the secret when set", () => {
    setEnv("AUTH_BYPASS_SECRET", "my-secret");
    expect(getAuthBypassSecret()).toBe("my-secret");
  });
});

describe("isDevBypassEnabled", () => {
  it("reflects NODE_ENV", () => {
    const expected = process.env.NODE_ENV === "development";
    expect(isDevBypassEnabled()).toBe(expected);
  });
});

describe("getDevBypassUserConfig", () => {
  afterEach(() => {
    clearEnv("DEV_AUTH_BYPASS_USER_ID");
    clearEnv("DEV_AUTH_BYPASS_EMAIL");
  });

  it("returns defaults when env vars are unset", () => {
    clearEnv("DEV_AUTH_BYPASS_USER_ID");
    clearEnv("DEV_AUTH_BYPASS_EMAIL");
    const config = getDevBypassUserConfig();
    expect(config.userId).toBe("dev_user");
    expect(config.email).toBe("dev@local");
  });

  it("respects env var overrides", () => {
    setEnv("DEV_AUTH_BYPASS_USER_ID", "custom_dev");
    setEnv("DEV_AUTH_BYPASS_EMAIL", "custom@dev");
    const config = getDevBypassUserConfig();
    expect(config.userId).toBe("custom_dev");
    expect(config.email).toBe("custom@dev");
  });
});

