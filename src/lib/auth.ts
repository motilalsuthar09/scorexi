// ============================================================
// ScoreXI — Auth Helpers (JWT + bcrypt)
// ============================================================
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;
const COOKIE_NAME = 'scorexi_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface JWTPayload {
  userId: string;
  email?: string;
  name: string;
  role: 'user' | 'admin';
  isGuest: boolean;
  claimedPlayerId?: string;
  iat?: number;
  exp?: number;
}

// ─── Password helpers ──────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ─── JWT helpers ───────────────────────────────────────────
export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// ─── Cookie helpers ────────────────────────────────────────
export function setAuthCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export function clearAuthCookie() {
  const cookieStore = cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function getTokenFromCookies(): string | null {
  const cookieStore = cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

// ─── Get current session from request ─────────────────────
export function getSession(req?: NextRequest): JWTPayload | null {
  let token: string | null = null;

  if (req) {
    // From request headers (API routes)
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
    // Also check cookie in request
    if (!token) {
      token = req.cookies.get(COOKIE_NAME)?.value ?? null;
    }
  } else {
    // From server component cookies()
    token = getTokenFromCookies();
  }

  if (!token) return null;
  return verifyToken(token);
}

// ─── Validate password strength ───────────────────────────
export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
}

// ─── Validate username ─────────────────────────────────────
export function validateUsername(username: string): string | null {
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 30) return 'Username must be under 30 characters';
  if (!/^[a-z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, underscores';
  return null;
}
