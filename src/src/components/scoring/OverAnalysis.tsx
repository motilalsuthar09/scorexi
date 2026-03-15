'use client';

import { useState, useEffect } from 'react';
import { cn, ballsToOvers } from '@/lib/utils';
import { BarChart3, Loader2 } from 'lucide-react';

interface OverData {
  overNumber: number;
  runs:       number;
  wickets:    number;
  balls:      { value: string; type: string }[];
  bowlerName: string;
}

interface Props {
  inningsId:  string;
  playerMap:  Record<string, any>;
  totalOvers: number;
}

export default function OverAnalysis({ inningsId, playerMap, totalOvers }: Props) {
  const [overs, setOvers]     = useState<OverData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/innings/${inningsId}/overs`)
      .then(r => r.json())
      .then(j => { if (j.success) setOvers(j.data.overs); })
      .finally(() => setLoading(false));
  }, [inningsId]);

  if (loading) return (
    <div className="flex justify-center py-6">
      <Loader2 size={20} className="animate-spin text-brand-400" />
    </div>
  );

  if (!overs.length) return (
    <p className="text-slate-500 text-sm text-center py-4">No overs bowled yet</p>
  );

  const maxRuns = Math.max(...overs.map(o => o.runs), 1);

  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold text-white flex items-center gap-2 text-sm">
        <BarChart3 size={15} className="text-brand-400" /> Over-by-Over
      </h3>

      {/* Bar chart */}
      <div className="flex items-end gap-1 h-20 px-1">
        {Array.from({ length: totalOvers }, (_, i) => {
          const over = overs.find(o => o.overNumber === i);
          const height = over ? Math.max(8, (over.runs / maxRuns) * 100) : 4;
          return (
            <button
              key={i}
              onClick={() => setSelected(selected === i ? null : i)}
              className="flex-1 flex flex-col items-center gap-0.5 group"
            >
              <div
                className={cn(
                  'w-full rounded-t-sm transition-all',
                  over?.wickets ? 'bg-score-wicket/70' :
                  over ? 'bg-brand-500/60 group-hover:bg-brand-500' :
                  'bg-pitch-border/40',
                  selected === i && 'bg-brand-500 ring-1 ring-brand-400'
                )}
                style={{ height: `${height}%` }}
              />
              <span className="text-[9px] text-slate-600 tabular">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Over detail */}
      {selected !== null && overs[selected] && (
        <div className="card p-3 animate-slide-up">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">
              Over {selected + 1} — {overs[selected].bowlerName}
            </span>
            <span className="text-xs text-white font-display font-bold">
              {overs[selected].runs} runs
              {overs[selected].wickets > 0 && (
                <span className="text-score-wicket ml-1">{overs[selected].wickets}W</span>
              )}
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {overs[selected].balls.map((b, i) => (
              <span key={i} className={`ball-${b.type}`}>{b.value}</span>
            ))}
          </div>
        </div>
      )}

      {/* Run rate per over */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'PP (1-6)',   overs: overs.slice(0, 6)  },
          { label: 'Mid',        overs: overs.slice(6, Math.max(overs.length - 4, 6)) },
          { label: 'Death',      overs: overs.slice(-4)    },
          { label: 'Total',      overs                     },
        ].map(seg => {
          const runs = seg.overs.reduce((s, o) => s + o.runs, 0);
          const balls = seg.overs.length * 6;
          const rr = balls > 0 ? ((runs / balls) * 6).toFixed(1) : '—';
          return (
            <div key={seg.label} className="bg-pitch-dark rounded-xl p-2">
              <p className="font-display font-bold text-sm text-white tabular">{rr}</p>
              <p className="text-slate-500 text-[10px]">{seg.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
