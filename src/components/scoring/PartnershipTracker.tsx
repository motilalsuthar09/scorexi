'use client';

import { cn } from '@/lib/utils';
import { Users2 } from 'lucide-react';

interface Partnership {
  striker:    string;
  nonStriker: string;
  runs:       number;
  balls:      number;
}

interface Props {
  partnerships: Partnership[];
  playerMap:    Record<string, any>;
}

export default function PartnershipTracker({ partnerships, playerMap }: Props) {
  if (!partnerships?.length) return null;

  const maxRuns = Math.max(...partnerships.map(p => p.runs), 1);
  const totalPartnershipRuns = partnerships.reduce((s, p) => s + p.runs, 0);

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
        <Users2 size={14} className="text-brand-400" /> Partnerships
      </h3>

      {partnerships.map((p, i) => {
        const strikerName     = playerMap[p.striker]?.name     ?? p.striker;
        const nonStrikerName  = playerMap[p.nonStriker]?.name  ?? p.nonStriker;
        const sr              = p.balls > 0 ? ((p.runs / p.balls) * 100).toFixed(1) : '0';
        const barWidth        = (p.runs / maxRuns) * 100;

        return (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">
                {strikerName} &amp; {nonStrikerName}
              </span>
              <span className="text-slate-500">
                {p.runs} runs ({p.balls} balls) · SR {sr}
              </span>
            </div>
            {/* Bar */}
            <div className="h-2 bg-pitch-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all duration-500"
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}

      <div className="text-xs text-slate-500 text-right">
        Total: {totalPartnershipRuns} runs
      </div>
    </div>
  );
}
