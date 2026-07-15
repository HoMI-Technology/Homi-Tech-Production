/**
 * At-rest encryption for Plaid access tokens (AES-256-GCM via node:crypto).
 *
 * Ciphertext format (stored in plaid_items.access_token_ct):
 *   v1:<base64 nonce (12 bytes)>:<base64 ciphertext || auth tag (16 bytes)>
 *
 * The version prefix exists so a future key/scheme rotation can decrypt old
 * rows while writing new ones (`plaid_items.key_version` tracks the key).
 * The key comes from PLAID_TOKEN_KEY — base64, decoding to exactly 32 bytes.
 *
 * NEVER log a plaintext token or a decrypted result; callers hold them only
 * as long as a single Plaid API call requires.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const VERSION = "v1";
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

function getKey(): Buffer {
  const raw = process.env.PLAID_TOKEN_KEY;
  if (!raw) {
    throw new Error(
      '[HōMI plaid] Missing PLAID_TOKEN_KEY. Set it to a base64-encoded 32-byte key ' +
        '(e.g. `openssl rand -base64 32`) before storing bank connections.',
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `[HōMI plaid] PLAID_TOKEN_KEY must be base64 for exactly ${KEY_BYTES} bytes ` +
        `(got ${key.length} bytes after decoding).`,
    );
  }
  return key;
}

/** Encrypts a Plaid access token for storage. Fresh random nonce per call. */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const payload = Buffer.concat([ciphertext, cipher.getAuthTag()]);
  return `${VERSION}:${nonce.toString("base64")}:${payload.toString("base64")}`;
}

/**
 * Decrypts a stored token. Throws on a malformed value, an unknown version,
 * a wrong key, or any tampering (GCM auth tag mismatch).
 */
export function decryptToken(ct: string): string {
  const parts = ct.split(":");
  if (parts.length !== 3) {
    throw new Error("[HōMI plaid] Malformed token ciphertext (expected version:nonce:payload).");
  }
  const [version, nonceB64, payloadB64] = parts;

  switch (version) {
    case "v1": {
      const key = getKey();
      const nonce = Buffer.from(nonceB64, "base64");
      const payload = Buffer.from(payloadB64, "base64");
      if (nonce.length !== NONCE_BYTES || payload.length <= TAG_BYTES) {
        throw new Error("[HōMI plaid] Malformed token ciphertext (bad nonce or payload length).");
      }
      const ciphertext = payload.subarray(0, payload.length - TAG_BYTES);
      const tag = payload.subarray(payload.length - TAG_BYTES);
      const decipher = createDecipheriv("aes-256-gcm", key, nonce);
      decipher.setAuthTag(tag);
      try {
        return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
      } catch {
        // Deliberately generic: never echo key material or ciphertext details.
        throw new Error("[HōMI plaid] Token decryption failed (wrong key or tampered ciphertext).");
      }
    }
    default:
      throw new Error(`[HōMI plaid] Unknown token ciphertext version "${version}".`);
  }
}
