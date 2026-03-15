// src/app/api/admin/users/route.ts
import { NextRequest } from 'next/server';
import { connectDB }   from '@/lib/db';
import User            from '@/models/User';
import { getSession }  from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return apiError('Admin only', 403);

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) return apiSuccess({ users: [] });

  await connectDB();

  const regex = new RegExp(q, 'i');
  const users = await User.find({
    $or: [{ name: regex }, { email: regex }],
    isGuest: false,
  })
    .limit(20)
    .select('name email role provider isBanned claimedPlayerId createdAt')
    .lean();

  return apiSuccess({ users });
}
