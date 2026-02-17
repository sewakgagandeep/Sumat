import crypto from 'crypto';

/**
 * Generate a random 6-digit pairing code
 */
export function generatePairingCode(): string {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate a random ID (hex string)
 */
export function generateId(bytes: number = 16): string {
    return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash a string with SHA-256
 */
export function sha256(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a secure random token for auth
 */
export function generateToken(): string {
    return crypto.randomBytes(32).toString('base64url');
}
