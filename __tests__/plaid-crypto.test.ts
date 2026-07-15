import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptToken, decryptToken } from "@/lib/plaid/crypto";

const KEY = randomBytes(32).toString("base64");
const TOKEN = "access-sandbox-11111111-2222-3333-4444-555555555555";

beforeEach(() => {
  vi.stubEnv("PLAID_TOKEN_KEY", KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("plaid token crypto (AES-256-GCM)", () => {
  it("round-trips a token and never stores it in the clear", () => {
    const ct = encryptToken(TOKEN);
    expect(ct).not.toContain(TOKEN);
    expect(ct.startsWith("v1:")).toBe(true);
    expect(decryptToken(ct)).toBe(TOKEN);
  });

  it("produces the v1:<nonce>:<payload> format with a 12-byte nonce", () => {
    const [version, nonceB64, payloadB64] = encryptToken(TOKEN).split(":");
    expect(version).toBe("v1");
    expect(Buffer.from(nonceB64, "base64").length).toBe(12);
    // payload = ciphertext + 16-byte GCM auth tag
    expect(Buffer.from(payloadB64, "base64").length).toBe(
      Buffer.byteLength(TOKEN, "utf8") + 16,
    );
  });

  it("uses a distinct nonce per call (same plaintext, different ciphertext)", () => {
    const a = encryptToken(TOKEN);
    const b = encryptToken(TOKEN);
    expect(a).not.toBe(b);
    expect(a.split(":")[1]).not.toBe(b.split(":")[1]);
    expect(decryptToken(a)).toBe(TOKEN);
    expect(decryptToken(b)).toBe(TOKEN);
  });

  it("detects tampering: a flipped ciphertext byte fails the GCM auth check", () => {
    const ct = encryptToken(TOKEN);
    const [version, nonceB64, payloadB64] = ct.split(":");
    const payload = Buffer.from(payloadB64, "base64");
    payload[0] ^= 0xff; // flip a byte inside the ciphertext region
    const tampered = `${version}:${nonceB64}:${payload.toString("base64")}`;
    expect(() => decryptToken(tampered)).toThrowError(/decryption failed/i);
  });

  it("throws when decrypting with a different key", () => {
    const ct = encryptToken(TOKEN);
    vi.stubEnv("PLAID_TOKEN_KEY", randomBytes(32).toString("base64"));
    expect(() => decryptToken(ct)).toThrowError(/decryption failed/i);
  });

  it("throws a clear error when PLAID_TOKEN_KEY is missing", () => {
    vi.stubEnv("PLAID_TOKEN_KEY", "");
    expect(() => encryptToken(TOKEN)).toThrowError(/PLAID_TOKEN_KEY/);
    expect(() => decryptToken("v1:AAAA:AAAA")).toThrowError(/PLAID_TOKEN_KEY/);
  });

  it("throws a clear error when the key is not 32 bytes", () => {
    vi.stubEnv("PLAID_TOKEN_KEY", randomBytes(16).toString("base64"));
    expect(() => encryptToken(TOKEN)).toThrowError(/32 bytes/);
  });

  it("rejects malformed ciphertexts and unknown versions", () => {
    expect(() => decryptToken("not-a-ciphertext")).toThrowError(/malformed/i);
    expect(() => decryptToken("v1:onlytwo")).toThrowError(/malformed/i);
    const ct = encryptToken(TOKEN);
    const bumped = ct.replace(/^v1:/, "v9:");
    expect(() => decryptToken(bumped)).toThrowError(/version/i);
  });
});
