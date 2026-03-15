'use client';

import { useState, useEffect } from 'react';
import {
  Share2, Copy, MessageCircle, Check, ExternalLink,
  Globe, Lock, Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  matchId:    string;
  token:      string;
  visibility: 'public' | 'private';
  onToggleVisibility: () => void;
}

export default function ShareSheet({ matchId, token, visibility, onToggleVisibility }: Props) {
  const [shareData, setShareData] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [copied, setCopied]       = useState<'link' | 'text' | null>(null);

  useEffect(() => {
    fetch(`/api/share/${matchId}?token=${token}`)
      .then(r => r.json())
      .then(j => { if (j.success) setShareData(j.data); })
      .finally(() => setLoading(false));
  }, [matchId, token]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareData.shareUrl);
    setCopied('link');
    setTimeout(() => setCopied(null), 2500);
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(shareData.whatsappText);
    setCopied('text');
    setTimeout(() => setCopied(null), 2500);
  };

  const nativeShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: shareData.match.title,
        text:  shareData.whatsappText,
        url:   shareData.shareUrl,
      });
    }
  };

  if (loading) return (
    <div className="flex justify-center py-10">
      <Loader2 size={22} className="animate-spin text-brand-400" />
    </div>
  );

  if (!shareData) return null;

  const { match, shareUrl, whatsappUrl } = shareData;

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Match summary preview */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Share2 size={15} className="text-brand-400" />
          <span className="font-display font-semibold text-white text-sm">Share Match</span>
          <span className={cn(
            'ml-auto text-xs px-2 py-0.5 rounded-full border',
            visibility === 'live' || match.status === 'live'
              ? 'text-score-wicket border-score-wicket/30 bg-score-wicket/10'
              : 'text-slate-400 border-pitch-border'
          )}>
            {match.status === 'live' ? '🔴 LIVE' : '✅ Done'}
          </span>
        </div>

        {/* Score preview */}
        <div className="bg-pitch-dark rounded-xl p-3 mb-3 space-y-1.5">
          <p className="font-display font-semibold text-white text-sm">
            {match.title}
          </p>
          {match.innings.map((inn: any) => (
            <div key={inn.number} className="flex justify-between text-sm">
              <span className="text-slate-400">{inn.team}</span>
              <span className="font-display font-bold text-white tabular">
                {inn.runs}/{inn.wickets}
                <span className="text-slate-500 font-normal text-xs ml-1">({inn.overs})</span>
                {inn.target && (
                  <span className="text-score-wide text-xs ml-2">T:{inn.target}</span>
                )}
              </span>
            </div>
          ))}
          {match.result && (
            <p className="text-brand-400 text-xs font-semibold pt-1 border-t border-pitch-border">
              🏆 {match.result.summary}
            </p>
          )}
        </div>

        {/* Share link */}
        <div className="flex gap-2">
          <input
            readOnly
            value={shareUrl}
            className="input-field text-xs flex-1 py-2"
            onClick={e => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={copyLink}
            className={cn(
              'px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all flex items-center gap-1.5',
              copied === 'link'
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'btn-primary'
            )}
          >
            {copied === 'link' ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                     bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366]
                     font-display font-semibold text-sm hover:bg-[#25D366]/25 transition-all"
        >
          <MessageCircle size={16} />
          WhatsApp
        </a>

        {/* Copy scorecard text */}
        <button
          onClick={copyText}
          className={cn(
            'flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-display font-semibold text-sm transition-all border',
            copied === 'text'
              ? 'bg-brand-500/15 border-brand-500/30 text-brand-400'
              : 'border-pitch-border text-slate-300 hover:text-white hover:border-pitch-muted'
          )}
        >
          {copied === 'text' ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Score</>}
        </button>

        {/* Native share (mobile) */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={nativeShare}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl
                       border border-pitch-border text-slate-300 font-display font-semibold
                       text-sm hover:text-white hover:border-pitch-muted transition-all"
          >
            <ExternalLink size={16} /> More Apps
          </button>
        )}

        {/* Visibility toggle */}
        <button
          onClick={onToggleVisibility}
          className={cn(
            'flex items-center justify-center gap-2 py-3 px-4 rounded-xl border',
            'font-display font-semibold text-sm transition-all',
            visibility === 'public'
              ? 'border-score-wicket/30 text-score-wicket hover:bg-score-wicket/10'
              : 'border-brand-500/30 text-brand-400 hover:bg-brand-500/10'
          )}
        >
          {visibility === 'public'
            ? <><Lock size={15} /> Make Private</>
            : <><Globe size={15} /> Make Public</>
          }
        </button>
      </div>

      {/* WhatsApp message preview */}
      <div className="card p-4">
        <p className="text-xs text-slate-500 mb-2 font-semibold uppercase tracking-wider">
          WhatsApp Message Preview
        </p>
        <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-body">
          {shareData.whatsappText}
        </pre>
      </div>
    </div>
  );
}
