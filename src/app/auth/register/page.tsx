'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { Loader2, Eye, EyeOff, UserPlus, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const claimId      = searchParams.get('claim'); // ?claim=playerId

  const [form, setForm] = useState({
    name: '', email: '', password: '', username: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const update = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await register({
      name:          form.name,
      email:         form.email,
      password:      form.password,
      username:      form.username || undefined,
      claimPlayerId: claimId || undefined,
    });
    if (err) { setError(err); setLoading(false); return; }
    router.push('/profile?welcome=1');
  };

  return (
    <div className="min-h-dvh pitch-bg flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
              <span className="font-display font-bold text-white">XI</span>
            </div>
            <span className="font-display font-bold text-2xl text-white">
              Score<span className="text-brand-400">XI</span>
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            {claimId ? 'Create account to claim your profile' : 'Create your free account'}
          </p>
        </div>

        {/* Claim banner */}
        {claimId && (
          <div className="bg-brand-500/10 border border-brand-500/25 rounded-2xl p-4 mb-4 flex items-start gap-3">
            <CheckCircle size={18} className="text-brand-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-brand-400 font-semibold text-sm">Claiming Player Profile</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Your match history and stats will be linked to your new account.
              </p>
            </div>
          </div>
        )}

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => update('name', e.target.value)}
                className="input-field"
                placeholder="Rohit Sharma"
                required maxLength={80}
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                className="input-field"
                placeholder="rohit@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">
                Username <span className="text-slate-600 text-xs">(optional — for profile URL)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => update('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="input-field pl-8"
                  placeholder="rohit_xi"
                  maxLength={30}
                />
              </div>
              {form.username && (
                <p className="text-xs text-slate-500 mt-1">
                  Profile: scorexi.com/player/@{form.username}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Password *</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  className="input-field pr-11"
                  placeholder="Min 8 chars, 1 letter + 1 number"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Password strength bar */}
              {form.password && (
                <div className="mt-2 flex gap-1">
                  {[8, 12, 16].map(len => (
                    <div
                      key={len}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        form.password.length >= len
                          ? len >= 16 ? 'bg-brand-500' : len >= 12 ? 'bg-score-wide' : 'bg-score-wicket'
                          : 'bg-pitch-border'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-score-wicket/10 border border-score-wicket/30 rounded-xl px-4 py-3">
                <p className="text-score-wicket text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Creating account...</>
                : <><UserPlus size={16} /> Create Account</>
              }
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-pitch-border text-center">
            <p className="text-slate-400 text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-brand-400 hover:text-brand-300 font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-4">
          <Link href="/" className="text-slate-500 text-sm hover:text-slate-400">
            ← Back to ScoreXI
          </Link>
        </p>
      </div>
    </div>
  );
}
