// src/app/api/auth/google/route.ts
import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID    = process.env.GOOGLE_CLIENT_ID!;
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL!;
const REDIRECT_URI = `${APP_URL}/api/auth/google/callback`;

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const claim = searchParams.get('claim') ?? '';

  const state = Buffer.from(JSON.stringify({ claim })).toString('base64url');

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'openid email profile',
    state,
    access_type:   'online',
    prompt:        'select_account',
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
