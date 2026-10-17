'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { useGame } from '@/store/game';

/** "Гарах": leave the room on the server, forget the seat, go home. */
export function useLeaveRoom(): () => void {
  const router = useRouter();
  const leave = useGame((s) => s.leave);
  return useCallback(() => {
    void leave().then(() => router.push('/'));
  }, [leave, router]);
}
