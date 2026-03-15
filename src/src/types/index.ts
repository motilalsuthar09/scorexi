// ============================================================
// ScoreXI — Core TypeScript Types
// ============================================================

export type Visibility = 'public' | 'private';
export type MatchStatus = 'setup' | 'live' | 'innings_break' | 'completed';
export type ExtraType = 'wide' | 'no_ball' | 'bye' | 'leg_bye' | null;
export type DismissalType =
  | 'bowled' | 'caught' | 'lbw' | 'run_out'
  | 'stumped' | 'hit_wicket' | 'retired' | null;

// ─── Player ────────────────────────────────────────────────
export interface IPlayer {
  _id: string;
  name: string;
  username?: string;
  phone?: string;
  email?: string;
  userId?: string;          // set when a real user claims this profile
  profilePic?: string;
  isClaimed: boolean;
  createdAt: Date;
  stats: PlayerCareerStats;
}

export interface PlayerCareerStats {
  matchesPlayed: number;
  totalRuns: number;
  totalBallsFaced: number;
  totalFours: number;
  totalSixes: number;
  highestScore: number;
  totalWickets: number;
  totalOversBowled: number;       // stored as balls for precision
  totalRunsConceded: number;
  bestBowling: string;            // e.g. "4/22"
}

// ─── Team ──────────────────────────────────────────────────
export interface ITeam {
  name: string;
  playerIds: string[];            // references to IPlayer._id
  players?: IPlayer[];            // populated
}

// ─── Match ─────────────────────────────────────────────────
export interface IMatch {
  _id: string;
  title?: string;
  hostId?: string;                // userId of creator (null for guests)
  teamA: ITeam;
  teamB: ITeam;
  totalOvers: number;
  currentInnings: 1 | 2;
  status: MatchStatus;
  visibility: Visibility;
  shareToken: string;             // secure random token for private link sharing
  tossWonBy?: 'teamA' | 'teamB';
  tossChoice?: 'bat' | 'bowl';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  result?: MatchResult;
}

export interface MatchResult {
  winner: 'teamA' | 'teamB' | 'tie' | 'no_result';
  winnerName: string;
  margin?: string;                // e.g. "5 wickets" or "23 runs"
  summary: string;
}

// ─── Innings ───────────────────────────────────────────────
export interface IInnings {
  _id: string;
  matchId: string;
  inningsNumber: 1 | 2;
  battingTeam: 'teamA' | 'teamB';
  bowlingTeam: 'teamA' | 'teamB';
  totalRuns: number;
  wickets: number;
  totalBalls: number;             // legal deliveries (excludes wides/no-balls)
  extras: ExtrasBreakdown;
  currentBatsmanIds: [string, string];  // [striker, non-striker]
  currentBowlerId: string;
  isCompleted: boolean;
  targetRuns?: number;
}

export interface ExtrasBreakdown {
  wides: number;
  noBalls: number;
  byes: number;
  legByes: number;
  total: number;
}

// ─── Ball (Score Event) ────────────────────────────────────
export interface IBall {
  _id: string;
  matchId: string;
  inningsId: string;
  inningsNumber: 1 | 2;
  overNumber: number;             // 0-indexed
  ballNumber: number;             // 0-indexed within the over (legal balls only)
  totalBallsInInnings: number;    // running count of legal balls
  batsmanId: string;
  bowlerId: string;
  runsOffBat: number;             // 0–6
  extras: number;                 // runs added for extra (1 for wide/no-ball etc.)
  extraType: ExtraType;
  isWicket: boolean;
  dismissalType: DismissalType;
  dismissedPlayerId?: string;
  fielderIds?: string[];
  isLegalDelivery: boolean;       // false for wides and no-balls
  timestamp: Date;
  // Computed totals after this ball (for quick display)
  inningsRunsAfter: number;
  inningsWicketsAfter: number;
}

// ─── Scorecard (computed, not stored) ─────────────────────
export interface BatsmanScorecard {
  player: IPlayer;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  dismissal: string;              // "c Sharma b Patel" or "not out"
  isStriker: boolean;
  batting: boolean;               // currently at crease
}

export interface BowlerScorecard {
  player: IPlayer;
  overs: string;                  // "4.2" format
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  isBowling: boolean;
}

export interface InningsScorecard {
  innings: IInnings;
  batting: BatsmanScorecard[];
  bowling: BowlerScorecard[];
  fallOfWickets: FallOfWicket[];
  recentBalls: BallDisplay[];
}

export interface FallOfWicket {
  wicketNumber: number;
  runs: number;
  over: string;
  playerName: string;
}

export interface BallDisplay {
  value: string;                  // "4", "W", "Wd", "0", "6" etc.
  type: 'run' | 'wicket' | 'four' | 'six' | 'wide' | 'noball' | 'bye' | 'legbye' | 'dot';
}

// ─── API Response Types ────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Form Types ────────────────────────────────────────────
export interface CreateMatchForm {
  title?: string;
  teamAName: string;
  teamBName: string;
  totalOvers: number;
  visibility: Visibility;
  tossWonBy: 'teamA' | 'teamB';
  tossChoice: 'bat' | 'bowl';
}

export interface AddPlayerForm {
  name: string;
  existingPlayerId?: string;
}

export interface BallInput {
  runsOffBat: number;
  extraType: ExtraType;
  isWicket: boolean;
  dismissalType?: DismissalType;
  dismissedPlayerId?: string;
  newBatsmanId?: string;
}

// ─── Auth ──────────────────────────────────────────────────
export interface IUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
  provider: 'credentials' | 'google' | 'guest';
  role: 'user' | 'admin';
  claimedPlayerId?: string;
  createdAt: Date;
}

export interface GuestSession {
  guestId: string;
  createdAt: number;
}
