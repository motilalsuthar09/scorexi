// ============================================================
// ScoreXI — Utility Functions
// ============================================================
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';

// ─── Tailwind class merger ─────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Secure share token generator ─────────────────────────
export function generateShareToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// ─── Guest ID generator ───────────────────────────────────
export function generateGuestId(): string {
  return `guest_${crypto.randomBytes(16).toString('hex')}`;
}

// ─── API Response helpers ──────────────────────────────────
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status }
  );
}

export function apiError(message: string, status = 400) {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message },
    { status }
  );
}

// ─── In-memory rate limiter (replace with Redis in prod) ──
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  limit = 60,
  windowMs = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) return false;

  record.count++;
  return true;
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

// ─── Cricket computation helpers ──────────────────────────

/** Format balls to "overs.balls" e.g. 16 balls → "2.4" */
export function ballsToOvers(balls: number): string {
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return rem === 0 ? `${overs}` : `${overs}.${rem}`;
}

/** Parse "2.4" overs to 16 balls */
export function oversToBalls(overs: number): number {
  const full = Math.floor(overs);
  const part = Math.round((overs - full) * 10);
  return full * 6 + part;
}

/** Compute batting strike rate */
export function strikeRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return Math.round((runs / balls) * 100 * 10) / 10;
}

/** Compute bowling economy */
export function economy(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return Math.round((runs / balls) * 6 * 100) / 100;
}

/** Compute batting average */
export function battingAverage(runs: number, dismissals: number): number {
  if (dismissals === 0) return runs; // not out
  return Math.round((runs / dismissals) * 100) / 100;
}

/** Required run rate */
export function requiredRunRate(target: number, scored: number, ballsLeft: number): number {
  const remaining = target - scored;
  if (ballsLeft === 0) return Infinity;
  return Math.round((remaining / ballsLeft) * 6 * 100) / 100;
}

/** Current run rate */
export function currentRunRate(runs: number, balls: number): number {
  if (balls === 0) return 0;
  return Math.round((runs / balls) * 6 * 100) / 100;
}

/** Format a scorecard display string for a ball */
export function formatBallDisplay(
  runsOffBat: number,
  extraType: string | null,
  isWicket: boolean
): { value: string; type: string } {
  if (isWicket) return { value: 'W', type: 'wicket' };
  if (extraType === 'wide') return { value: 'Wd', type: 'wide' };
  if (extraType === 'no_ball') return { value: 'Nb', type: 'noball' };
  if (extraType === 'bye' || extraType === 'leg_bye')
    return { value: runsOffBat > 0 ? `+${runsOffBat}` : '0', type: 'bye' };
  if (runsOffBat === 4) return { value: '4', type: 'four' };
  if (runsOffBat === 6) return { value: '6', type: 'six' };
  if (runsOffBat === 0) return { value: '0', type: 'dot' };
  return { value: String(runsOffBat), type: 'run' };
}

/** Check if extra is a legal delivery (advances ball count) */
export function isLegalDelivery(extraType: string | null): boolean {
  return extraType !== 'wide' && extraType !== 'no_ball';
}

/** Sanitize string input (basic XSS prevention) */
export function sanitizeString(str: string, maxLen = 100): string {
  return str
    .trim()
    .slice(0, maxLen)
    .replace(/[<>"'`]/g, '');
}

/** Generate a short human-readable match ID for URLs */
export function generateMatchSlug(teamA: string, teamB: string): string {
  const clean = (s: string) =>
    s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 10);
  const rand = crypto.randomBytes(3).toString('hex');
  return `${clean(teamA)}-vs-${clean(teamB)}-${rand}`;
}
