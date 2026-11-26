'use client';
import { useEffect } from 'react';

/** Puts the current game's palette on the whole page (see [data-game] in globals.css). */
export function useGameTheme(game?: string | null) {
  useEffect(() => {
    if (!game) return;
    document.body.dataset.game = game;
    return () => { delete document.body.dataset.game; };
  }, [game]);
}
