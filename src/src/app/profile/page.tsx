'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  Loader2, LogOut, User, Trophy, Target,
  CheckCircle, Settings, ExternalLink, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProfilePage() {
  const { user, logout, loading: authLoading } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const isWelcome    = searchParams.get('welcome') === '1';

  const [playerData, setPlayerData] = useState<any>(null);
  const [editName, setEditName]     = useState('');
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.claimedPlayerId) {
      fetch(`/api/player/${user.claimedPlayerId}`)
        .then(r => r.json())
        .then(j => {
          if (j.success) {
            setPlayerData(j.data);
            setEditName(j.data.player.name);
          }
        });
    }
  }, [user?.claimedPlayerId]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleSave = async () => {
    if (!user?.claimedPlayerId || !editName.trim()) return;
    setSaving(true);
    const res  = await fetch(`/api/player/${user.claimedPlayerId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: editName }),
    });
    const json = await res.json();
    setSaveMsg(json.success ? '✓ Saved' : json.error || 'Error');
    setTimeout(() => setSaveMsg(''), 3000);
    setSaving(false);
  };

  if (authLoading) return (
    <AppShell>
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={28} className="animate-spin text-brand-400" />
      </div>
    </AppShell>
  );

  if (!user) return null;

  const stats = playerData?.player?.stats;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Welcome banner */}
        {isWelcome && (
          <div className="card p-4 mb-5 bg-brand-500/10 border-brand-500/25 flex items-center gap-3">
            <CheckCircle size={20} className="text-brand-400 flex-shrink-0" />
            <div>
              <p className="font-display font-bold text-white">Welcome to ScoreXI! 🏏</p>
              <p className="text-slate-400 text-sm">Your account is set up. Start scoring or browse matches.</p>
            </div>
          </div>
        )}

        {/* Profile header */}
        <div className="card p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-brand-600 to-brand-400 rounded-2xl
                            flex items-center justify-center shadow-lg shadow-brand-500/30 flex-shrink-0">
              <span className="font-display font-bold text-white text-xl">
                {user.name[0].toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="font-display font-bold text-xl text-white">{user.name}</h1>
              {user.email && <p className="text-slate-400 text-sm">{user.email}</p>}
              {user.claimedPlayerId && (
                <Link href={`/player/${user.claimedPlayerId}`}
                  className="inline-flex items-center gap-1 text-brand-400 text-xs hover:text-brand-300 mt-1">
                  <ExternalLink size={11} /> View public profile
                </Link>
              )}
            </div>
            <button onClick={handleLogout}
              className="btn-ghost flex items-center gap-1.5 text-xs text-slate-400">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>

        {/* Career stats — only if has claimed player */}
        {stats && (
          <div className="card p-5 mb-4">
            <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-score-wide" /> Career Stats
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: 'Matches',  value: stats.matchesPlayed,  color: 'text-brand-400' },
                { label: 'Runs',     value: stats.totalRuns,       color: 'text-score-wide' },
                { label: 'Wickets',  value: stats.totalWickets,    color: 'text-score-wicket' },
                { label: 'Best',     value: stats.highestScore,    color: 'text-score-six' },
                { label: '4s',       value: stats.totalFours,      color: 'text-score-four' },
                { label: '6s',       value: stats.totalSixes,      color: 'text-score-six' },
              ].map(s => (
                <div key={s.label} className="text-center bg-pitch-dark rounded-xl p-3">
                  <p className={cn('font-display font-bold text-xl tabular', s.color)}>{s.value}</p>
                  <p className="text-slate-500 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
            <Link href={`/player/${user.claimedPlayerId}`}
              className="mt-3 text-sm text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Full stats →
            </Link>
          </div>
        )}

        {/* No player profile yet */}
        {!user.claimedPlayerId && (
          <div className="card p-5 mb-4 border-dashed">
            <p className="font-display font-semibold text-white mb-1">No player profile linked</p>
            <p className="text-slate-400 text-sm mb-3">
              Search for your name in a past match and claim it, or your profile will auto-create next time you're added to a match.
            </p>
            <Link href="/players" className="btn-secondary text-sm py-2">
              Search Players
            </Link>
          </div>
        )}

        {/* Edit profile */}
        <div className="card p-5 mb-4">
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2">
            <Settings size={16} className="text-slate-400" /> Edit Profile
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Display Name</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="input-field"
                maxLength={80}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary py-2 px-5 text-sm flex items-center gap-2"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Save Changes
              </button>
              {saveMsg && (
                <span className={cn('text-sm font-semibold',
                  saveMsg.startsWith('✓') ? 'text-brand-400' : 'text-score-wicket'
                )}>{saveMsg}</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/new-match" className="card-hover p-4 flex items-center gap-3">
            <Star size={18} className="text-brand-400" />
            <span className="font-display font-semibold text-white text-sm">New Match</span>
          </Link>
          <Link href="/leaderboard" className="card-hover p-4 flex items-center gap-3">
            <Trophy size={18} className="text-score-wide" />
            <span className="font-display font-semibold text-white text-sm">Leaderboard</span>
          </Link>
        </div>

      </div>
    </AppShell>
  );
}
