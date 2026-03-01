'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { Loader2, Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const { login }  = useAuth();
  const router     = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const err = await login(email, password);
    if (err) { setError(err); setLoading(false); return; }
    router.push('/profile');
  };

  return (
    <div className="min-h-dvh pitch-bg flex items-center justify-center px-4">
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
          <p className="text-slate-400 text-sm">Sign in to your account</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="Your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
                ? <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                : <><LogIn size={16} /> Sign In</>
              }
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-pitch-border text-center">
            <p className="text-slate-400 text-sm">
              No account?{' '}
              <Link href="/auth/register" className="text-brand-400 hover:text-brand-300 font-semibold">
                Register free
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
