import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomBytes } from "crypto";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a random short code for URL shortening
 * SECURITY: Uses cryptographically secure random bytes instead of Math.random()
 * Default length increased from 6 to 8 characters for enhanced security
 * - 6 chars: 62^6  ≈ 56.8 billion combinations
 * - 8 chars: 62^8  ≈ 218 trillion combinations
 */
export function generateShortCode(length: number = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i++) {
    // Use modulo bias mitigation by rejecting values >= 256 - (256 % chars.length)
    // For chars.length=62, this rejects values >= 254
    const maxValidValue = 256 - (256 % chars.length);
    let byte = bytes[i];

    // Regenerate byte if it's in the biased range
    while (byte >= maxValidValue) {
      byte = randomBytes(1)[0];
    }

    result += chars.charAt(byte % chars.length);
  }
  return result;
}

/**
 * Format a number with commas (e.g., 1234 -> 1,234)
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("ja-JP").format(num);
}

/**
 * Format a date to Japanese locale string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Calculate percentage
 */
export function calcPercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100;
}

/**
 * Wait for a specified amount of time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
