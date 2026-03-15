// ============================================================
// ScoreXI — Ball (ScoreEvent) Model
// Each delivery is one document — highly efficient, scalable
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface BallDoc extends Document {
  matchId:           mongoose.Types.ObjectId;
  inningsId:         mongoose.Types.ObjectId;
  inningsNumber:     1 | 2;
  overNumber:        number;    // 0-indexed
  ballInOver:        number;    // 0-indexed, legal balls only in over
  totalBallsInInnings: number;  // running count of legal balls
  batsmanId:         mongoose.Types.ObjectId;
  bowlerId:          mongoose.Types.ObjectId;
  runsOffBat:        number;
  extras:            number;
  extraType:         'wide' | 'no_ball' | 'bye' | 'leg_bye' | null;
  isWicket:          boolean;
  dismissalType:     string | null;
  dismissedPlayerId?: mongoose.Types.ObjectId;
  fielderIds:        mongoose.Types.ObjectId[];
  isLegalDelivery:   boolean;
  // Running totals after this ball (denormalized for fast display)
  inningsRunsAfter:    number;
  inningsWicketsAfter: number;
  timestamp:           Date;
}

const ballSchema = new Schema<BallDoc>({
  matchId:             { type: Schema.Types.ObjectId, ref: 'Match',   required: true },
  inningsId:           { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
  inningsNumber:       { type: Number, enum: [1, 2], required: true },
  overNumber:          { type: Number, required: true, min: 0 },
  ballInOver:          { type: Number, required: true, min: 0 },
  totalBallsInInnings: { type: Number, required: true, min: 0 },
  batsmanId:           { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  bowlerId:            { type: Schema.Types.ObjectId, ref: 'Player', required: true },
  runsOffBat:          { type: Number, required: true, min: 0, max: 6 },
  extras:              { type: Number, default: 0, min: 0 },
  extraType:           { type: String, enum: ['wide', 'no_ball', 'bye', 'leg_bye', null], default: null },
  isWicket:            { type: Boolean, default: false },
  dismissalType:       { type: String, default: null },
  dismissedPlayerId:   { type: Schema.Types.ObjectId, ref: 'Player' },
  fielderIds:          [{ type: Schema.Types.ObjectId, ref: 'Player' }],
  isLegalDelivery:     { type: Boolean, required: true },
  inningsRunsAfter:    { type: Number, required: true },
  inningsWicketsAfter: { type: Number, required: true },
  timestamp:           { type: Date, default: Date.now },
}, {
  collection: 'balls',
});

// Critical indexes for scorecard queries
ballSchema.index({ inningsId: 1, totalBallsInInnings: 1 });
ballSchema.index({ matchId: 1, inningsNumber: 1 });
ballSchema.index({ matchId: 1, timestamp: -1 });
ballSchema.index({ batsmanId: 1 });
ballSchema.index({ bowlerId: 1 });

const Ball: Model<BallDoc> =
  mongoose.models.Ball || mongoose.model<BallDoc>('Ball', ballSchema);

export default Ball;
