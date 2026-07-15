import jwt from 'jsonwebtoken';
import type { UserRole } from '@/models/User';

// --- Token Payload Types ---

export interface AccessTokenPayload {
  userId: string;
  role: UserRole;
  societyId: string | null;
  unitId?: string | null;
  type: 'access';
}

export interface RefreshTokenPayload {
  userId: string;
  family: string; // Token family for rotation detection
  type: 'refresh';
}

// --- Configuration ---

function getSecret(envVar: string): string {
  const secret = process.env[envVar];
  if (!secret) {
    throw new Error(`${envVar} environment variable is not set`);
  }
  return secret;
}

const JWT_SECRET = () => getSecret('JWT_SECRET');
const JWT_REFRESH_SECRET = () => getSecret('JWT_REFRESH_SECRET');
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

// --- Access Token ---

export function signAccessToken(payload: Omit<AccessTokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'access' },
    JWT_SECRET(),
    { expiresIn: ACCESS_EXPIRY as any }
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET()) as AccessTokenPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type: expected access token');
  }
  return decoded;
}

// --- Refresh Token ---

export function signRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): string {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    JWT_REFRESH_SECRET(),
    { expiresIn: REFRESH_EXPIRY as any }
  );
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET()) as RefreshTokenPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh token');
  }
  return decoded;
}
