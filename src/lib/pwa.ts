'use client';

import { useEffect } from 'react';

export function usePWA() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('[ScoreXI SW] registered, scope:', reg.scope);
        })
        .catch(err => {
          console.warn('[ScoreXI SW] registration failed:', err);
        });
    }
  }, []);
}

export async function subscribeToPush(matchId: string): Promise<boolean> {
  try {
    if (!('PushManager' in window)) return false;

    const reg = await navigator.serviceWorker.ready;
    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!VAPID_PUBLIC_KEY) return false;

    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await fetch('/api/notifications', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ matchId, subscription: sub.toJSON() }),
    });

    return true;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}
