import { timingSafeEqual, scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { supabaseAdmin } from "./db";

const scryptAsync = promisify(scrypt);

/**
 * Check if a user is an administrator
 *
 * Admin users are defined by either:
 * 1. ADMIN_EMAIL environment variable (matches user's email)
 * 2. ADMIN_USER_IDS environment variable (comma-separated UUIDs)
 *
 * @param userId - The user ID to check
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    // Get user email from Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (error || !data.user) {
      console.error(`[admin] Failed to get user ${userId}:`, error);
      return false;
    }

    const userEmail = data.user.email;

    // Check ADMIN_EMAIL
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail && userEmail === adminEmail) {
      console.log(`[admin] User ${userId} is admin (email match)`);
      return true;
    }

    // Check ADMIN_USER_IDS
    const adminIds = process.env.ADMIN_USER_IDS?.split(",").map((id) =>
      id.trim()
    );
    if (adminIds && adminIds.includes(userId)) {
      console.log(`[admin] User ${userId} is admin (ID match)`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`[admin] Error checking admin status for ${userId}:`, error);
    return false;
  }
}

/**
 * Check if admin feature is enabled
 *
 * Admin feature is enabled if either ADMIN_EMAIL or ADMIN_USER_IDS is set
 *
 * @returns boolean - true if admin feature is enabled
 */
export function isAdminFeatureEnabled(): boolean {
  return !!(process.env.ADMIN_EMAIL || process.env.ADMIN_USER_IDS);
}

/**
 * Generate password hash for ADMIN_PASSWORD environment variable
 *
 * Usage: node -e "require('./lib/admin').generatePasswordHash('your-password').then(console.log)"
 *
 * Format: scrypt:<salt>:<hash>
 *
 * @param password - The plaintext password to hash
 * @returns Promise<string> - The hashed password in format "scrypt:<salt>:<hash>"
 */
export async function generatePasswordHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

/**
 * Verify admin password
 *
 * Supports both hashed passwords (scrypt:salt:hash) and legacy plaintext passwords.
 * Uses Node.js crypto.scrypt for secure password hashing.
 * Uses Node.js crypto.timingSafeEqual() to prevent timing attacks.
 *
 * **Security Warning**: Plaintext password support is deprecated and will be removed in future versions.
 * Use generatePasswordHash() to create a hashed password for ADMIN_PASSWORD.
 *
 * @param password - The password to verify
 * @returns Promise<boolean> - true if password matches, false otherwise
 */
export async function verifyAdminPassword(password: string | null | undefined): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;

  // If ADMIN_PASSWORD is not set, deny all access
  if (!adminPassword) {
    console.warn("[admin] ADMIN_PASSWORD not set - denying access");
    return false;
  }

  // If password is not provided, deny access
  if (!password) {
    console.warn("[admin] No password provided");
    return false;
  }

  try {
    // Check if password is hashed (format: scrypt:salt:hash)
    if (adminPassword.startsWith('scrypt:')) {
      const [, salt, storedHash] = adminPassword.split(':');

      if (!salt || !storedHash) {
        console.error("[admin] Invalid password hash format in ADMIN_PASSWORD");
        return false;
      }

      // Hash the provided password with the same salt
      const hash = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashHex = hash.toString('hex');

      // Constant-time comparison
      const hashBuf = Buffer.from(hashHex, 'hex');
      const storedHashBuf = Buffer.from(storedHash, 'hex');

      if (hashBuf.length !== storedHashBuf.length) {
        return false;
      }

      const isValid = timingSafeEqual(hashBuf, storedHashBuf);

      if (!isValid) {
        console.warn("[admin] Invalid password attempt (scrypt)");
      }

      return isValid;
    } else {
      // Legacy plaintext password support (DEPRECATED)
      console.warn("[admin] DEPRECATED: Using plaintext password comparison. Please migrate to hashed password using generatePasswordHash().");

      // Use constant-time comparison to prevent timing attacks
      const passwordBuf = Buffer.from(password, "utf8");
      const adminPasswordBuf = Buffer.from(adminPassword, "utf8");

      // Length check (necessary for timingSafeEqual)
      if (passwordBuf.length !== adminPasswordBuf.length) {
        return false;
      }

      const isValid = timingSafeEqual(passwordBuf, adminPasswordBuf);

      if (!isValid) {
        console.warn("[admin] Invalid password attempt (plaintext)");
      }

      return isValid;
    }
  } catch (error) {
    console.error("[admin] Error verifying password:", error);
    return false;
  }
}
