import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Get encryption key from environment
 * SECURITY: Validates key length for AES-256 (32 bytes)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.DATA_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("DATA_ENCRYPTION_KEY environment variable is not set");
  }

  // Remove 'base64:' prefix if present
  const keyString = key.startsWith("base64:") ? key.slice(7) : key;
  const keyBuffer = Buffer.from(keyString, "base64");

  // SECURITY: Ensure key is exactly 32 bytes for AES-256
  if (keyBuffer.length !== 32) {
    throw new Error(
      `Encryption key must be exactly 32 bytes for AES-256-GCM (got ${keyBuffer.length} bytes)`
    );
  }

  return keyBuffer;
}

/**
 * Encrypt a string using AES-256-GCM
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  // Return: iv:tag:encrypted
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a string using AES-256-GCM
 * SECURITY: Validates IV and auth tag lengths before decryption
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format");
  }

  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];

  // SECURITY: Validate IV and tag lengths to prevent tampering
  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH}, got ${iv.length}`);
  }
  if (tag.length !== TAG_LENGTH) {
    throw new Error(`Invalid auth tag length: expected ${TAG_LENGTH}, got ${tag.length}`);
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Hash a string using SHA-256 (for idempotency keys)
 */
export function hash(text: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(text).digest("hex");
}
