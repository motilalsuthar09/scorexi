'use client';
// src/lib/pwa.ts
import { useEffect, useState, useCallback } from 'react';

// ── Service worker registration ───────────────────────────
export function usePWA() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => console.log('[SW] registered', reg.scope))
        .catch(err => console.warn('[SW] failed', err));
    }
  }, []);
}

// ── Push subscriptions ────────────────────────────────────
export async function subscribeToPush(matchId: string): Promise<boolean> {
  try {
    if (!('PushManager' in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const KEY = process.env.NEXT_PUBLIC_VAPID_KEY;
    if (!KEY) return false;
    const existing = await reg.pushManager.getSubscription();
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(KEY),
    });
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, subscription: sub.toJSON() }),
    });
    return true;
  } catch { return false; }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

// ── Offline scoring queue (IndexedDB) ────────────────────
const DB_NAME    = 'scorexi-offline';
const DB_VERSION = 1;
const STORE      = 'ball-queue';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function getQueue(): Promise<any[]> {
  const db  = await openDB();
  const all = await new Promise<any[]>((res, rej) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
  db.close();
  return all;
}

async function removeFromQueue(id: number): Promise<void> {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
  db.close();
}

async function addToQueue(item: any): Promise<void> {
  const db = await openDB();
  await new Promise<void>((res, rej) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).add(item);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
  db.close();
}

export interface OfflineScoringState {
  isOffline:  boolean;
  queueSize:  number;
  isSyncing:  boolean;
  syncError:  string;
  queueBall:  (matchId: string, token: string, payload: any) => Promise<any>;
  undoQueued: () => void;
  flushQueue: () => Promise<void>;
}

export function useOfflineScoring(): OfflineScoringState {
  const [isOffline, setIsOffline] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');

  const refreshCount = useCallback(async () => {
    const q = await getQueue();
    setQueueSize(q.length);
  }, []);

  // ── flushQueue MUST be defined BEFORE the useEffect that calls it ──
  const flushQueue = useCallback(async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;
    setIsSyncing(true);
    setSyncError('');
    for (const item of queue) {
      try {
        const res = await fetch(`/api/match/${item.matchId}/ball?token=${item.token}`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(item.payload),
        });
        if (res.status >= 400 && res.status < 500) {
          setSyncError('Sync error — some balls could not be saved');
          break;
        }
        await removeFromQueue(item.id);
      } catch {
        setSyncError('Sync failed — will retry when back online');
        break;
      }
    }
    await refreshCount();
    setIsSyncing(false);
  }, [refreshCount]);

  // ── Online/offline listeners — defined AFTER flushQueue ──
  useEffect(() => {
    const onOnline  = () => { setIsOffline(false); flushQueue(); };
    const onOffline = () => setIsOffline(true);
    setIsOffline(!navigator.onLine);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    refreshCount();
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [flushQueue, refreshCount]);

  const queueBall = useCallback(async (matchId: string, token: string, payload: any) => {
    if (navigator.onLine) {
      const res = await fetch(`/api/match/${matchId}/ball?token=${token}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      return res.json();
    }
    await addToQueue({ matchId, token, payload, ts: Date.now() });
    await refreshCount();
    return { success: true, offline: true };
  }, [refreshCount]);

  const undoQueued = useCallback(async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;
    await removeFromQueue(queue[queue.length - 1].id);
    await refreshCount();
  }, [refreshCount]);

  return { isOffline, queueSize, isSyncing, syncError, queueBall, undoQueued, flushQueue };
}
