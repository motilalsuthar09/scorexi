// ============================================================
// GET /api/auth/me — get current logged in user
// ============================================================
import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session) return apiError('Not authenticated', 401);
  return apiSuccess({ user: session });
}
