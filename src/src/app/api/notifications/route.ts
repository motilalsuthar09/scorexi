// ============================================================
// POST /api/notifications/subscribe  — save push subscription
// DELETE /api/notifications/subscribe — remove subscription
// POST /api/notifications/send       — send notification (internal)
// ============================================================
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/utils';
import mongoose, { Schema, Model, Document } from 'mongoose';

// ── PushSubscription model (lightweight) ──────────────────
interface PushSubDoc extends Document {
  matchId:      string;
  endpoint:     string;
  keys:         { p256dh: string; auth: string };
  createdAt:    Date;
}

const pushSubSchema = new Schema<PushSubDoc>({
  matchId:  { type: String, required: true, index: true },
  endpoint: { type: String, required: true },
  keys:     { p256dh: String, auth: String },
}, { timestamps: true });

pushSubSchema.index({ matchId: 1, endpoint: 1 }, { unique: true });

const PushSub: Model<PushSubDoc> =
  mongoose.models.PushSub || mongoose.model<PushSubDoc>('PushSub', pushSubSchema);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, subscription } = body;

    if (!matchId || !subscription?.endpoint) {
      return apiError('matchId and subscription required', 422);
    }

    await connectDB();

    await PushSub.findOneAndUpdate(
      { matchId, endpoint: subscription.endpoint },
      { matchId, endpoint: subscription.endpoint, keys: subscription.keys },
      { upsert: true, new: true }
    );

    return apiSuccess({ subscribed: true });
  } catch (err) {
    console.error('[POST /api/notifications/subscribe]', err);
    return apiError('Subscribe failed', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { matchId, endpoint } = await req.json();
    await connectDB();
    await PushSub.deleteOne({ matchId, endpoint });
    return apiSuccess({ unsubscribed: true });
  } catch (err) {
    return apiError('Unsubscribe failed', 500);
  }
}
