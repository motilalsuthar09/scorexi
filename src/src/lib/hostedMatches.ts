// ============================================================
// hostedMatches — persist match IDs + tokens in localStorage
// so the host can resume scoring after back/refresh
// ============================================================
const LS_KEY = 'scorexi_hosted_v2';  // bumped from v1 to clear stale format

export interface HostedMatch {
  id:      string;
  token:   string;
  title:   string;
  isQuick: boolean;   // ← NEW: tracks whether this was a Quick Match
  savedAt: number;
}

export function saveHostedMatch(
  id:      string,
  token:   string,
  title:   string,
  isQuick: boolean = false,   // ← NEW param (defaults false for full matches)
) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getHostedMatchKeys();
    const updated  = [
      { id, token, title, isQuick, savedAt: Date.now() },
      ...existing.filter(m => m.id !== id),
    ].slice(0, 30);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  } catch {}
}

export function getHostedMatchKeys(): HostedMatch[] {
  if (typeof window === 'undefined') return [];
  try {
    // Try new key first, fall back to v1 for migration
    const raw = localStorage.getItem(LS_KEY) ?? localStorage.getItem('scorexi_hosted_v1');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function removeHostedMatch(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getHostedMatchKeys();
    localStorage.setItem(LS_KEY, JSON.stringify(existing.filter(m => m.id !== id)));
  } catch {}
}

// ── formatKeysParam: now outputs id:token:isQuick(1|0) ──────
// The hosted API parses "id:token:isQuick" triples and appends
// &quick=1 to resumeUrl when isQuick=true — fixing the resume bug.
export function formatKeysParam(): string {
  return getHostedMatchKeys()
    .map(m => `${m.id}:${m.token}:${m.isQuick ? '1' : '0'}`)
    .join(',');
}