// src/app/api/admin/users/[id]/ban/route.ts
import { NextRequest } from 'next/server';
import { connectDB }   from '@/lib/db';
import User            from '@/models/User';
import { getSession }  from '@/lib/auth';
import { apiSuccess, apiError } from '@/lib/utils';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(req);
  if (!session || session.role !== 'admin') return apiError('Admin only', 403);

  const { ban } = await req.json() as { ban: boolean };

  await connectDB();

  const user = await User.findById(params.id);
  if (!user) return apiError('User not found', 404);
  if (user.role === 'admin') return apiError('Cannot ban admins', 403);

  (user as any).isBanned = ban;
  (user as any).bannedAt = ban ? new Date() : undefined;
  await user.save();

  return apiSuccess({ isBanned: ban });
}
