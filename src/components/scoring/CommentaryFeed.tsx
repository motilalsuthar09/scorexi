'use client';

import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Loader2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Comment {
  _id:      string;
  type:     string;
  text:     string;
  overBall: string;
  timestamp: string;
}

interface Props {
  matchId:   string;
  token:     string;
  isLive:    boolean;
}

const TYPE_STYLES: Record<string, string> = {
  wicket:         'border-l-score-wicket bg-score-wicket/5 text-score-wicket',
  six:            'border-l-score-six bg-score-six/5',
  four:           'border-l-score-four bg-score-four/5',
  milestone:      'border-l-score-wide bg-score-wide/5',
  maiden:         'border-l-brand-500 bg-brand-500/5',
  over_complete:  'border-l-pitch-muted',
  innings_start:  'border-l-brand-500 bg-brand-500/5',
  match_end:      'border-l-brand-500 bg-brand-500/10',
  default:        'border-l-pitch-border',
};

const TYPE_ICONS: Record<string, string> = {
  wicket:    '🏏',
  six:       '💥',
  four:      '🎯',
  milestone: '⭐',
  maiden:    '🔒',
  default:   '•',
};

export default function CommentaryFeed({ matchId, token, isLive }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading]   = useState(true);
  const bottomRef               = useRef<HTMLDivElement>(null);

  const fetchComments = async () => {
    const res  = await fetch(`/api/match/${matchId}/commentary?token=${token}&limit=30`);
    const json = await res.json();
    if (json.success) setComments(json.data.commentary);
    setLoading(false);
  };

  useEffect(() => { fetchComments(); }, [matchId]);

  // Live polling
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchComments, 5000);
    return () => clearInterval(interval);
  }, [isLive, matchId]);

  // Auto-scroll to latest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 size={20} className="animate-spin text-brand-400" />
    </div>
  );

  if (!comments.length) return (
    <div className="text-center py-8">
      <MessageSquare size={28} className="text-slate-600 mx-auto mb-2" />
      <p className="text-slate-500 text-sm">No commentary yet. Start scoring!</p>
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <Volume2 size={14} className="text-brand-400" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Live Commentary
        </span>
        {isLive && (
          <span className="ml-auto flex items-center gap-1 text-score-wicket text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-score-wicket animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
        {comments.map(c => (
          <div
            key={c._id}
            className={cn(
              'border-l-2 px-3 py-2 rounded-r-xl text-sm transition-all',
              TYPE_STYLES[c.type] ?? TYPE_STYLES.default
            )}
          >
            <div className="flex items-start gap-2">
              <span className="text-base leading-none flex-shrink-0 mt-0.5">
                {TYPE_ICONS[c.type] ?? TYPE_ICONS.default}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white leading-relaxed">{c.text}</p>
                <p className="text-slate-600 text-xs mt-0.5">{c.overBall}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
