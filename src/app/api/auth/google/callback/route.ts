// src/app/api/auth/google/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB }       from '@/lib/db';
import User                from '@/models/User';
import Player              from '@/models/Player';
import { signToken, setAuthCookie } from '@/lib/auth';
import { sanitizeString }  from '@/lib/utils';

const APP_URL      = process.env.NEXT_PUBLIC_APP_URL!;
const CLIENT_ID    = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SEC   = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = `${APP_URL}/api/auth/google/callback`;

interface GoogleProfile {
  sub:            string;
  name:           string;
  email:          string;
  picture?:       string;
  email_verified: boolean;
}

async function exchangeCode(code: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SEC,
      redirect_uri:  REDIRECT_URI,
      grant_type:    'authorization_code',
    }),
  });
  if (!res.ok) return null;
  return res.json() as Promise<{ access_token: string }>;
}

async function fetchProfile(accessToken: string): Promise<GoogleProfile | null> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get('code');
  const state = searchParams.get('state') ?? 'none';
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${APP_URL}/auth/login?error=google_denied`);
  }

  let claimPlayerId: string | null = null;
  try {
    if (state !== 'none') {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      claimPlayerId = decoded.claim || null;
    }
  } catch { /* ignore */ }

  const tokens = await exchangeCode(code);
  if (!tokens) return NextResponse.redirect(`${APP_URL}/auth/login?error=google_token`);

  const profile = await fetchProfile(tokens.access_token);
  if (!profile || !profile.email_verified) {
    return NextResponse.redirect(`${APP_URL}/auth/login?error=google_profile`);
  }

  await connectDB();

  // Find by googleId first, then by email
  let user = await User.findOne({ googleId: profile.sub });
  if (!user && profile.email) {
    user = await User.findOne({ email: profile.email.toLowerCase() });
    if (user) {
      // Merge googleId onto existing credentials account
      (user as any).googleId = profile.sub;
      if (!(user as any).image && profile.picture) (user as any).image = profile.picture;
      await user.save();
    }
  }

  let claimedPlayerId: string | undefined;

  if (!user) {
    // New user
    user = await User.create({
      name:     sanitizeString(profile.name, 80),
      email:    profile.email.toLowerCase(),
      googleId: profile.sub,
      image:    profile.picture,
      provider: 'google',
      role:     'user',
      isGuest:  false,
    });

    // Claim player if requested
    if (claimPlayerId) {
      const player = await Player.findById(claimPlayerId);
      if (player && !player.isClaimed) {
        player.isClaimed = true;
        player.userId    = user._id as any;
        player.email     = profile.email.toLowerCase();
        await player.save();
        claimedPlayerId = player._id.toString();
        await User.findByIdAndUpdate(user._id, { claimedPlayerId: player._id });
      }
    }

    // Auto-create player profile if no claim
    if (!claimedPlayerId) {
      const player = await Player.create({
        name:       sanitizeString(profile.name, 80),
        email:      profile.email.toLowerCase(),
        profilePic: profile.picture,
        userId:     user._id,
        isClaimed:  true,
      });
      claimedPlayerId = player._id.toString();
      await User.findByIdAndUpdate(user._id, { claimedPlayerId: player._id });
    }
  } else {
    if ((user as any).isBanned) {
      return NextResponse.redirect(`${APP_URL}/auth/login?error=account_suspended`);
    }
    claimedPlayerId = (user as any).claimedPlayerId?.toString();
  }

  const token = signToken({
    userId:          user._id.toString(),
    email:           (user as any).email,
    name:            user.name,
    role:            user.role as 'user' | 'admin',
    isGuest:         false,
    claimedPlayerId,
  });

  setAuthCookie(token);

  const createdAt = (user as any).createdAt;
  const isNew = createdAt && (Date.now() - new Date(createdAt).getTime()) < 15_000;
  return NextResponse.redirect(`${APP_URL}/profile${isNew ? '?welcome=1' : ''}`);
}
