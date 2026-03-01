// ============================================================
// POST /api/auth/login
// DELETE /api/auth/login  (logout)
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import {
  verifyPassword, signToken, setAuthCookie, clearAuthCookie,
} from '@/lib/auth';
import { apiSuccess, apiError, getClientIp, checkRateLimit } from '@/lib/utils';
import { z } from 'zod';

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  // Brute-force protection: 10 attempts per 15 min
  if (!checkRateLimit(`login_${ip}`, 10, 15 * 60 * 1000)) {
    return apiError('Too many login attempts. Wait 15 minutes.', 429);
  }

  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError('Invalid email or password', 422);

    const { email, password } = parsed.data;
    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      return apiError('Invalid email or password', 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return apiError('Invalid email or password', 401);

    const token = signToken({
      userId:          user._id.toString(),
      email:           user.email,
      name:            user.name,
      role:            user.role as 'user' | 'admin',
      isGuest:         false,
      claimedPlayerId: user.claimedPlayerId?.toString(),
    });

    setAuthCookie(token);

    return apiSuccess({
      user: {
        id:              user._id.toString(),
        name:            user.name,
        email:           user.email,
        claimedPlayerId: user.claimedPlayerId?.toString(),
      },
      token,
    });
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    return apiError('Login failed', 500);
  }
}

export async function DELETE() {
  clearAuthCookie();
  return apiSuccess({ loggedOut: true });
}
