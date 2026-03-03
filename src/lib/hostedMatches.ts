// ============================================================
// hostedMatches — persist match IDs + tokens in localStorage
// so the host can resume scoring after back/refresh
// ============================================================
const LS_KEY = 'scorexi_hosted_v1';

export interface HostedMatch {
  id:      string;
  token:   string;
  title:   string;
  savedAt: number;
}

export function saveHostedMatch(id: string, token: string, title: string) {
  if (typeof window === 'undefined') return;
  try {
    const existing = getHostedMatchKeys();
    const updated  = [
      { id, token, title, savedAt: Date.now() },
      ...existing.filter(m => m.id !== id),
    ].slice(0, 30);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  } catch {}
}

export function getHostedMatchKeys(): HostedMatch[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
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

export function formatKeysParam(): string {
  return getHostedMatchKeys().map(m => `${m.id}:${m.token}`).join(',');
}
