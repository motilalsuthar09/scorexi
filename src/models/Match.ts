// ============================================================
// ScoreXI — Match Model
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';

const teamSchema = new Schema({
  name:      { type: String, required: true, trim: true, maxlength: 60 },
  playerIds: [{ type: Schema.Types.ObjectId, ref: 'Player' }],
}, { _id: false });

const resultSchema = new Schema({
  winner:     { type: String, enum: ['teamA', 'teamB', 'tie', 'no_result'] },
  winnerName: { type: String },
  margin:     { type: String },
  summary:    { type: String },
}, { _id: false });

export interface MatchDoc extends Document {
  title?: string;
  hostId?: mongoose.Types.ObjectId;
  teamA: { name: string; playerIds: mongoose.Types.ObjectId[] };
  teamB: { name: string; playerIds: mongoose.Types.ObjectId[] };
  totalOvers: number;
  currentInnings: 1 | 2;
  status: 'setup' | 'live' | 'innings_break' | 'completed';
  visibility: 'public' | 'private';
  shareToken: string;
  tossWonBy?: 'teamA' | 'teamB';
  tossChoice?: 'bat' | 'bowl';
  result?: {
    winner: string;
    winnerName: string;
    margin?: string;
    summary: string;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const matchSchema = new Schema<MatchDoc>({
  title:          { type: String, trim: true, maxlength: 100 },
  hostId:         { type: Schema.Types.ObjectId, ref: 'User', sparse: true },
  teamA:          { type: teamSchema, required: true },
  teamB:          { type: teamSchema, required: true },
  totalOvers:     { type: Number, required: true, min: 1, max: 50, default: 6 },
  currentInnings: { type: Number, enum: [1, 2], default: 1 },
  status:         { type: String, enum: ['setup', 'live', 'innings_break', 'completed'], default: 'setup' },
  visibility:     { type: String, enum: ['public', 'private'], default: 'private' },
  shareToken:     { type: String, required: true, unique: true, index: true },
  tossWonBy:      { type: String, enum: ['teamA', 'teamB'] },
  tossChoice:     { type: String, enum: ['bat', 'bowl'] },
  result:         { type: resultSchema },
  completedAt:    { type: Date },
}, {
  timestamps: true,
});

// Indexes
matchSchema.index({ status: 1, visibility: 1, createdAt: -1 });
matchSchema.index({ hostId: 1, createdAt: -1 });
matchSchema.index({
  'teamA.name': 'text',
  'teamB.name': 'text',
  title: 'text',
});

const Match: Model<MatchDoc> =
  mongoose.models.Match || mongoose.model<MatchDoc>('Match', matchSchema);

export default Match;
