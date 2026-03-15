'use client';

import { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const THEMES = [
  { name: 'Cricket Green', primary: '#22c55e', light: '#4ade80', bg: 'bg-green-500'  },
  { name: 'Electric Blue',  primary: '#2563eb', light: '#60a5fa', bg: 'bg-blue-600'   },
  { name: 'Royal Purple',   primary: '#7c3aed', light: '#a78bfa', bg: 'bg-violet-600' },
  { name: 'Flame Red',      primary: '#dc2626', light: '#f87171', bg: 'bg-red-600'    },
  { name: 'Golden',         primary: '#d97706', light: '#fbbf24', bg: 'bg-amber-600'  },
  { name: 'Cyan Ice',       primary: '#0891b2', light: '#22d3ee', bg: 'bg-cyan-600'   },
] as const;

export default function ThemeSwitcher() {
  const [active, setActive] = useState(0);
  const [open, setOpen]     = useState(false);

  const applyTheme = (idx: number) => {
    const t = THEMES[idx];
    document.documentElement.style.setProperty('--brand-primary', t.primary);
    document.documentElement.style.setProperty('--brand-light',   t.light);
    setActive(idx);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-ghost flex items-center gap-1.5 text-xs"
        title="Change theme"
      >
        <Palette size={14} />
        <span className="hidden sm:inline">Theme</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 z-50 card p-3 w-52 shadow-xl animate-slide-up">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              Pick a theme
            </p>
            {THEMES.map((t, i) => (
              <button
                key={t.name}
                onClick={() => applyTheme(i)}
                className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                <div className={cn('w-5 h-5 rounded-full flex-shrink-0', t.bg)} />
                <span className="text-sm text-slate-300 flex-1 text-left">{t.name}</span>
                {active === i && <Check size={13} className="text-brand-400" />}
              </button>
            ))}
            <div className="mt-2 pt-2 border-t border-pitch-border">
              <p className="text-[10px] text-slate-600 px-1">
                Permanent change: edit 2 lines in globals.css
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
