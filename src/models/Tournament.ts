// ============================================================
// ScoreXI — Tournament Model (Phase 3)
// Supports: round-robin, knockout, group+knockout
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';

export type TournamentFormat = 'round_robin' | 'knockout' | 'group_knockout';
export type TournamentStatus = 'setup' | 'live' | 'completed';

interface FixtureSlot {
  teamA:     string;
  teamB:     string;
  matchId?:  mongoose.Types.ObjectId;
  result?:   'teamA' | 'teamB' | 'tie' | 'pending';
  scheduled?: Date;
}

interface Group {
  name:    string;
  teams:   string[];
  fixtures: FixtureSlot[];
}

export interface TournamentDoc extends Document {
  name:        string;
  format:      TournamentFormat;
  status:      TournamentStatus;
  organiserUserId: mongoose.Types.ObjectId;
  teams:       string[];
  totalOvers:  number;
  groups?:     Group[];
  knockoutFixtures?: FixtureSlot[];
  winnerId?:   string;
  createdAt:   Date;
}

const fixtureSchema = new Schema<FixtureSlot>({
  teamA:     String,
  teamB:     String,
  matchId:   { type: Schema.Types.ObjectId, ref: 'Match' },
  result:    { type: String, enum: ['teamA', 'teamB', 'tie', 'pending'], default: 'pending' },
  scheduled: Date,
}, { _id: false });

const groupSchema = new Schema<Group>({
  name:     String,
  teams:    [String],
  fixtures: [fixtureSchema],
}, { _id: false });

const tournamentSchema = new Schema<TournamentDoc>({
  name:            { type: String, required: true, trim: true, maxlength: 120 },
  format:          { type: String, enum: ['round_robin', 'knockout', 'group_knockout'], required: true },
  status:          { type: String, enum: ['setup', 'live', 'completed'], default: 'setup' },
  organiserUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teams:           [{ type: String }],
  totalOvers:      { type: Number, default: 20 },
  groups:          [groupSchema],
  knockoutFixtures:[fixtureSchema],
  winnerId:        String,
}, { timestamps: true });

tournamentSchema.index({ organiserUserId: 1 });
tournamentSchema.index({ status: 1, createdAt: -1 });

const Tournament: Model<TournamentDoc> =
  mongoose.models.Tournament ||
  mongoose.model<TournamentDoc>('Tournament', tournamentSchema);

export default Tournament;
