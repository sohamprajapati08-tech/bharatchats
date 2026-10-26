import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Normalizes phone numbers:
 * Removes spaces, hyphens, and parentheses.
 * Ensures consistent Indian phone standard e.g. +91XXXXXXXXXX or standard international format.
 */
export function normalizePhone(rawPhone: string): string {
  const cleaned = rawPhone.replace(/[\s\-\(\)]/g, '');
  if (/^\d{10}$/.test(cleaned)) {
    // 10 digits without country code -> default to +91 (India)
    return `+91${cleaned}`;
  }
  if (/^91\d{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (/^\+\d{10,15}$/.test(cleaned)) {
    return cleaned;
  }
  return cleaned;
}
