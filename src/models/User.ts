// ============================================================
// ScoreXI — User Model
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface UserDoc extends Document {
  name: string;
  email?: string;
  passwordHash?: string;
  googleId?: string;
  image?: string;
  provider: 'credentials' | 'google' | 'guest';
  role: 'user' | 'admin';
  claimedPlayerId?: mongoose.Types.ObjectId;
  isGuest: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>({
  name:            { type: String, required: true, trim: true, maxlength: 80 },
  email:           { type: String, trim: true, lowercase: true, sparse: true, unique: true },
  passwordHash:    { type: String },
  googleId:        { type: String, sparse: true, unique: true },
  image:           { type: String },
  provider:        { type: String, enum: ['credentials', 'google', 'guest'], default: 'guest' },
  role:            { type: String, enum: ['user', 'admin'], default: 'user' },
  claimedPlayerId: { type: Schema.Types.ObjectId, ref: 'Player', sparse: true },
  isGuest:         { type: Boolean, default: false },
}, {
  timestamps: true,
});

userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });

const User: Model<UserDoc> =
  mongoose.models.User || mongoose.model<UserDoc>('User', userSchema);

export default User;
