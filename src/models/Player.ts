// ============================================================
// ScoreXI — Player Model
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface PlayerDoc extends Document {
  name: string;
  username?: string;
  phone?: string;
  email?: string;
  userId?: mongoose.Types.ObjectId;
  profilePic?: string;
  isClaimed: boolean;
  createdAt: Date;
  stats: {
    matchesPlayed: number;
    totalRuns: number;
    totalBallsFaced: number;
    totalFours: number;
    totalSixes: number;
    highestScore: number;
    notOuts: number;
    totalWickets: number;
    totalBallsBowled: number;
    totalRunsConceded: number;
    bestBowlingWickets: number;
    bestBowlingRuns: number;
  };
}

const statsSchema = new Schema({
  matchesPlayed:       { type: Number, default: 0 },
  totalRuns:           { type: Number, default: 0 },
  totalBallsFaced:     { type: Number, default: 0 },
  totalFours:          { type: Number, default: 0 },
  totalSixes:          { type: Number, default: 0 },
  highestScore:        { type: Number, default: 0 },
  notOuts:             { type: Number, default: 0 },
  totalWickets:        { type: Number, default: 0 },
  totalBallsBowled:    { type: Number, default: 0 },
  totalRunsConceded:   { type: Number, default: 0 },
  bestBowlingWickets:  { type: Number, default: 0 },
  bestBowlingRuns:     { type: Number, default: 999 },
}, { _id: false });

const playerSchema = new Schema<PlayerDoc>({
  name:       { type: String, required: true, trim: true, maxlength: 80 },
  username:   { type: String, trim: true, lowercase: true, maxlength: 30, sparse: true, unique: true },
  phone:      { type: String, trim: true, sparse: true },
  email:      { type: String, trim: true, lowercase: true, sparse: true },
  userId:     { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
  profilePic: { type: String },
  isClaimed:  { type: Boolean, default: false },
  stats:      { type: statsSchema, default: () => ({}) },
}, {
  timestamps: true,
});

// Indexes for fast search
playerSchema.index({ name: 'text' });
playerSchema.index({ username: 1 });
playerSchema.index({ userId: 1 });
playerSchema.index({ isClaimed: 1 });

const Player: Model<PlayerDoc> =
  mongoose.models.Player || mongoose.model<PlayerDoc>('Player', playerSchema);

export default Player;
