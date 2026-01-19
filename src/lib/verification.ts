/**
 * Verification Code Generator and Validator
 * Handles 6-digit code generation, hashing, and verification
 */

import bcrypt from 'bcryptjs';

/**
 * Generate a random 6-digit verification code
 * @returns 6-digit string (000000-999999)
 */
export function generateCode(): string {
  // Generate random number between 0 and 999999
  const code = Math.floor(Math.random() * 1000000);
  // Pad with zeros to ensure 6 digits
  return code.toString().padStart(6, '0');
}

/**
 * Hash a verification code using bcrypt
 * @param code - Plain text 6-digit code
 * @returns Hashed code
 */
export async function hashCode(code: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(code, saltRounds);
}

/**
 * Verify a code against its hash
 * @param code - Plain text code to verify
 * @param hash - Hashed code to compare against
 * @returns True if code matches hash
 */
export async function verifyCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/**
 * Calculate expiration time (10 minutes from now)
 * @returns ISO timestamp string
 */
export function getExpirationTime(): string {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  return expiresAt.toISOString();
}

/**
 * Check if a timestamp has expired
 * @param expiresAt - ISO timestamp string
 * @returns True if expired
 */
export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}
