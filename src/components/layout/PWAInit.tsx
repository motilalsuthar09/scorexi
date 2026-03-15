'use client';
// src/components/layout/PWAInit.tsx
// Thin client wrapper so layout.tsx stays a server component
import { usePWA } from '@/lib/pwa';

export default function PWAInit() {
  usePWA();
  return null;
}
