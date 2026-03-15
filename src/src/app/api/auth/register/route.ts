// ============================================================
// POST /api/auth/register
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Player from '@/models/Player';
import {
  hashPassword, signToken, setAuthCookie,
  validatePassword, validateUsername,
} from '@/lib/auth';
import { apiSuccess, apiError, getClientIp, checkRateLimit, sanitizeString } from '@/lib/utils';
import { z } from 'zod';

const schema = z.object({
  name:            z.string().min(2).max(80),
  email:           z.string().email(),
  password:        z.string().min(8),
  username:        z.string().min(3).max(30).optional(),
  claimPlayerId:   z.string().optional(), // optional: claim an existing player profile
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!checkRateLimit(`register_${ip}`, 5, 15 * 60 * 1000)) {
    return apiError('Too many registration attempts. Wait 15 minutes.', 429);
  }

  try {
    const body   = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422);

    const { name, email, password, username, claimPlayerId } = parsed.data;

    // Validate password strength
    const pwErr = validatePassword(password);
    if (pwErr) return apiError(pwErr, 422);

    if (username) {
      const unErr = validateUsername(username.toLowerCase());
      if (unErr) return apiError(unErr, 422);
    }

    await connectDB();

    // Check email uniqueness
    const existing = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existing) return apiError('An account with this email already exists', 409);

    // Check username uniqueness on player collection
    if (username) {
      const takenUsername = await Player.findOne({ username: username.toLowerCase() }).lean();
      if (takenUsername) return apiError('Username already taken', 409);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      name:    sanitizeString(name),
      email:   email.toLowerCase(),
      passwordHash,
      provider: 'credentials',
      role:    'user',
      isGuest: false,
    });

    // Handle player profile claim or creation
    let claimedPlayerId: string | undefined;

    if (claimPlayerId) {
      // Claim existing placeholder profile
      const player = await Player.findById(claimPlayerId);
      if (player && !player.isClaimed) {
        player.isClaimed  = true;
        player.userId     = user._id as typeof player.userId;
        player.email      = email.toLowerCase();
        if (username) player.username = username.toLowerCase();
        await player.save();
        claimedPlayerId = player._id.toString();

        // Link user to player
        await User.findByIdAndUpdate(user._id, { claimedPlayerId: player._id });
      }
    } else {
      // Auto-create a player profile for this user
      const player = await Player.create({
        name:      sanitizeString(name),
        email:     email.toLowerCase(),
        username:  username ? username.toLowerCase() : undefined,
        userId:    user._id,
        isClaimed: true,
      });
      claimedPlayerId = player._id.toString();
      await User.findByIdAndUpdate(user._id, { claimedPlayerId: player._id });
    }

    // Issue JWT
    const token = signToken({
      userId:          user._id.toString(),
      email:           user.email,
      name:            user.name,
      role:            user.role as 'user' | 'admin',
      isGuest:         false,
      claimedPlayerId,
    });

    setAuthCookie(token);

    return apiSuccess({
      user: {
        id:              user._id.toString(),
        name:            user.name,
        email:           user.email,
        claimedPlayerId,
      },
      token,
    }, 201);

  } catch (err) {
    console.error('[POST /api/auth/register]', err);
    return apiError('Registration failed', 500);
  }
}
