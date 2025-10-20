'use client';
import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('✅ Service Worker registered successfully'))
        .catch((err) => console.warn('❌ SW registration failed:', err));
    }
  }, []);
  return null;
}
