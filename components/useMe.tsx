'use client';
import { useCallback, useEffect, useState } from 'react';
import { resetSocket } from '@/lib/useRoom';

type Me = { id: string; name: string } | null;
let cache: Me | undefined;
const listeners = new Set<(m: Me) => void>();

export function useMe() {
  const [me, setMeState] = useState<Me | undefined>(cache);

  useEffect(() => {
    listeners.add(setMeState);
    if (cache === undefined) {
      fetch('/api/me').then((r) => r.json()).then((d) => { cache = d.user; listeners.forEach((l) => l(cache!)); }).catch(() => {});
    }
    return () => { listeners.delete(setMeState); };
  }, []);

  const saveName = useCallback(async (name: string): Promise<string | null> => {
    const r = await fetch('/api/me', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return d.error || 'ما قدرنا نحفظ الاسم.';
    cache = d.user;
    resetSocket();
    listeners.forEach((l) => l(cache!));
    return null;
  }, []);

  return { me: me ?? null, loading: me === undefined, saveName };
}
