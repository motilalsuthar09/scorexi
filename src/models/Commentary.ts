// ============================================================
// ScoreXI — Commentary Model (Phase 3)
// Auto-generated commentary for key events
// ============================================================
import mongoose, { Schema, Document, Model } from 'mongoose';

export type CommentaryType =
  | 'wicket' | 'four' | 'six' | 'milestone'
  | 'over_complete' | 'innings_start' | 'match_start'
  | 'match_end' | 'partnership' | 'maiden';

export interface CommentaryDoc extends Document {
  matchId:    mongoose.Types.ObjectId;
  inningsId:  mongoose.Types.ObjectId;
  ballId?:    mongoose.Types.ObjectId;
  type:       CommentaryType;
  text:       string;
  overBall:   string; // "12.3"
  timestamp:  Date;
}

const commentarySchema = new Schema<CommentaryDoc>({
  matchId:   { type: Schema.Types.ObjectId, ref: 'Match',   required: true, index: true },
  inningsId: { type: Schema.Types.ObjectId, ref: 'Innings', required: true },
  ballId:    { type: Schema.Types.ObjectId, ref: 'Ball' },
  type:      { type: String, required: true },
  text:      { type: String, required: true, maxlength: 280 },
  overBall:  { type: String },
  timestamp: { type: Date, default: Date.now },
}, { timestamps: false });

commentarySchema.index({ matchId: 1, timestamp: -1 });

const Commentary: Model<CommentaryDoc> =
  mongoose.models.Commentary ||
  mongoose.model<CommentaryDoc>('Commentary', commentarySchema);

export default Commentary;

// ── Auto-generate commentary text ─────────────────────────
export function generateCommentary(
  type: CommentaryType,
  opts: {
    batsmanName?: string;
    bowlerName?:  string;
    runs?:        number;
    wickets?:     number;
    overs?:       string;
    target?:      number;
    teamName?:    string;
  }
): string {
  const { batsmanName = 'Batsman', bowlerName = 'Bowler', runs = 0 } = opts;

  const WICKET_TEXTS = [
    `OUT! ${bowlerName} strikes! ${batsmanName} has to walk back.`,
    `WICKET! What a delivery from ${bowlerName}! ${batsmanName} is gone!`,
    `${batsmanName} dismissed by ${bowlerName}! The crowd erupts!`,
    `CLEAN BOWLED! ${bowlerName} rearranges the furniture for ${batsmanName}!`,
  ];

  const FOUR_TEXTS = [
    `FOUR! ${batsmanName} times it beautifully through the covers!`,
    `FOUR! Cracking shot by ${batsmanName}! The fielder had no chance.`,
    `BOUNDARY! ${batsmanName} drives it effortlessly to the rope.`,
    `FOUR! That's a gorgeous stroke from ${batsmanName}!`,
  ];

  const SIX_TEXTS = [
    `SIX! ${batsmanName} launches it into the crowd! What a hit!`,
    `MAXIMUM! ${batsmanName} deposits ${bowlerName} into the stands!`,
    `SIX! That's gone a LONG way! ${batsmanName} is on fire!`,
    `SIX! A clean, powerful strike from ${batsmanName}. The crowd is loving it!`,
  ];

  const rand = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

  switch (type) {
    case 'wicket':     return rand(WICKET_TEXTS);
    case 'four':       return rand(FOUR_TEXTS);
    case 'six':        return rand(SIX_TEXTS);
    case 'milestone':
      return `MILESTONE! ${batsmanName} brings up ${runs} runs! Well played!`;
    case 'over_complete':
      return `End of over ${opts.overs}. ${runs} runs scored this over by ${bowlerName}.`;
    case 'innings_start':
      return `${opts.teamName} begin their innings. Target: ${opts.target ?? 'to set'}.`;
    case 'match_end':
      return `That's the end of the match! ${opts.teamName} ${runs > 0 ? `win by ${runs} runs!` : 'win!'} `;
    case 'maiden':
      return `MAIDEN OVER! ${bowlerName} bowls a brilliant maiden. Excellent control!`;
    default:
      return `${batsmanName} continues at the crease.`;
  }
}
