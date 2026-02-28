// ============================================================
// ScoreXI — Innings Model
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface InningsDoc extends Document {
  matchId: mongoose.Types.ObjectId;
  inningsNumber: 1 | 2;
  battingTeam: 'teamA' | 'teamB';
  bowlingTeam: 'teamA' | 'teamB';
  totalRuns: number;
  wickets: number;
  totalBalls: number;       // legal deliveries only
  totalDeliveries: number;  // all deliveries incl. wides/no-balls
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
    total: number;
  };
  currentStrikerId: mongoose.Types.ObjectId | null;
  currentNonStrikerId: mongoose.Types.ObjectId | null;
  currentBowlerId: mongoose.Types.ObjectId | null;
  isCompleted: boolean;
  targetRuns?: number;
  createdAt: Date;
  updatedAt: Date;
}

const extrasSchema = new Schema({
  wides:   { type: Number, default: 0 },
  noBalls: { type: Number, default: 0 },
  byes:    { type: Number, default: 0 },
  legByes: { type: Number, default: 0 },
  total:   { type: Number, default: 0 },
}, { _id: false });

const inningsSchema = new Schema<InningsDoc>({
  matchId:            { type: Schema.Types.ObjectId, ref: 'Match', required: true, index: true },
  inningsNumber:      { type: Number, enum: [1, 2], required: true },
  battingTeam:        { type: String, enum: ['teamA', 'teamB'], required: true },
  bowlingTeam:        { type: String, enum: ['teamA', 'teamB'], required: true },
  totalRuns:          { type: Number, default: 0 },
  wickets:            { type: Number, default: 0 },
  totalBalls:         { type: Number, default: 0 },
  totalDeliveries:    { type: Number, default: 0 },
  extras:             { type: extrasSchema, default: () => ({}) },
  currentStrikerId:   { type: Schema.Types.ObjectId, ref: 'Player', default: null },
  currentNonStrikerId:{ type: Schema.Types.ObjectId, ref: 'Player', default: null },
  currentBowlerId:    { type: Schema.Types.ObjectId, ref: 'Player', default: null },
  isCompleted:        { type: Boolean, default: false },
  targetRuns:         { type: Number },
}, {
  timestamps: true,
});

inningsSchema.index({ matchId: 1, inningsNumber: 1 }, { unique: true });

const Innings: Model<InningsDoc> =
  mongoose.models.Innings || mongoose.model<InningsDoc>('Innings', inningsSchema);

export default Innings;
