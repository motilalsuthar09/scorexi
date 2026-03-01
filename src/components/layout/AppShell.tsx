'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PlusCircle, Users, User, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/',            label: 'Home',   icon: Home       },
  { href: '/leaderboard', label: 'Top',    icon: Trophy     },
  { href: '/new-match',   label: 'Score',  icon: PlusCircle, primary: true },
  { href: '/players',     label: 'Players',icon: Users      },
  { href: '/profile',     label: 'Profile',icon: User       },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-dvh">
      {/* ── Desktop top navbar ─────────────────────────── */}
      <header className="hidden md:block glass sticky top-0 z-40 border-b border-pitch-border">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center
                            group-hover:bg-brand-400 transition-colors">
              <span className="font-display font-bold text-white text-sm">XI</span>
            </div>
            <span className="font-display font-bold text-xl text-white tracking-wide">
              Score<span className="text-brand-400">XI</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="flex items-center gap-1">
            {navItems.filter(i => !i.primary).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body',
                  'transition-all duration-150',
                  pathname === item.href
                    ? 'bg-brand-500/10 text-brand-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                )}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <Link href="/new-match" className="btn-primary flex items-center gap-2 text-sm py-2">
            <PlusCircle size={16} />
            New Match
          </Link>
        </nav>
      </header>

      {/* ── Mobile top bar (logo only) ─────────────────── */}
      <header className="md:hidden glass sticky top-0 z-40 border-b border-pitch-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <span className="font-display font-bold text-white text-xs">XI</span>
            </div>
            <span className="font-display font-bold text-lg text-white">
              Score<span className="text-brand-400">XI</span>
            </span>
          </Link>
          <Link href="/new-match" className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1">
            <PlusCircle size={13} />
            New
          </Link>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────── */}
      <main className="flex-1 pb-20 md:pb-0 pitch-bg min-h-0">
        {children}
      </main>

      {/* ── Mobile bottom navigation ───────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-pitch-border nav-safe-bottom">
        <div className="grid grid-cols-5 h-16">
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 transition-all duration-150',
                  item.primary && 'relative',
                )}
              >
                {item.primary ? (
                  <div className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center -mt-6',
                    'bg-brand-500 shadow-lg shadow-brand-500/40',
                    'transition-transform active:scale-90'
                  )}>
                    <item.icon size={22} className="text-white" />
                  </div>
                ) : (
                  <>
                    <item.icon
                      size={20}
                      className={active ? 'text-brand-400' : 'text-slate-500'}
                    />
                    <span className={cn(
                      'text-[10px] font-body',
                      active ? 'text-brand-400' : 'text-slate-500'
                    )}>
                      {item.label}
                    </span>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
