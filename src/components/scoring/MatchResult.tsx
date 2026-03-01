'use client';

import Link from 'next/link';
import { Trophy, Share2, RotateCcw, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  result:    { winner: string; winnerName: string; margin?: string; summary: string };
  match:     any;
  onShare:   () => void;
}

export default function MatchResult({ result, match, onShare }: Props) {
  const isTie       = result.winner === 'tie';
  const isNoResult  = result.winner === 'no_result';

  return (
    <div className="card overflow-hidden animate-fade-in">
      {/* Trophy banner */}
      <div className={cn(
        'p-6 text-center relative overflow-hidden',
        isTie ? 'bg-score-wide/10' : isNoResult ? 'bg-pitch-border/50' : 'bg-brand-500/10'
      )}>
        <div className="absolute inset-0 bg-live-pulse pointer-events-none" />
        <div className="relative">
          {!isTie && !isNoResult ? (
            <>
              <div className="text-6xl mb-2">🏆</div>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-white mb-1">
                {result.winnerName}
              </h2>
              <p className="font-display text-brand-400 font-semibold">
                won by {result.margin}
              </p>
            </>
          ) : isTie ? (
            <>
              <div className="text-6xl mb-2">🤝</div>
              <h2 className="font-display font-bold text-2xl text-white">Match Tied!</h2>
            </>
          ) : (
            <>
              <div className="text-6xl mb-2">🌧️</div>
              <h2 className="font-display font-bold text-2xl text-white">No Result</h2>
            </>
          )}
        </div>
      </div>

      {/* Team scores */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[match.teamA, match.teamB].map((team: any, i: number) => (
            <div key={i} className={cn(
              'bg-pitch-dark rounded-xl p-3 text-center',
              result.winner === (i === 0 ? 'teamA' : 'teamB') && 'ring-1 ring-brand-500/40'
            )}>
              <p className="text-slate-400 text-xs mb-1">{team.name}</p>
              {result.winner === (i === 0 ? 'teamA' : 'teamB') && (
                <span className="text-[10px] bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-full">
                  Winner
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onShare}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Share2 size={16} /> Share Result
          </button>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/new-match" className="btn-secondary flex items-center justify-center gap-2 text-sm">
              <RotateCcw size={14} /> New Match
            </Link>
            <Link href="/" className="btn-secondary flex items-center justify-center gap-2 text-sm">
              <Home size={14} /> Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
