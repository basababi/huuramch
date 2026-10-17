'use client';

import { ACTIVE_PHASES, type PlayerView } from '@khuuramch/game-core';
import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { mn } from '@/i18n/mn';
import { useAudioUnlock } from '@/lib/sound';
import { useWakeLock } from '@/lib/use-wake-lock';
import { useGame, warmUpNetwork } from '@/store/game';
import { ConnectingScreen, MessageScreen } from './shell';
import { useRoomSound } from './use-room-sound';
import { playerById } from './view-helpers';

/*
 * Screens load as separate chunks so the first paint only needs the shell (§7: ≤ 180 KB initial
 * JS on the player route). All of them are requested right after hydration, in parallel with the
 * socket connecting, so moving between phases never waits on the network.
 */
const load = {
  motion: () => import('../motion-provider'),
  join: () => import('./join-screen'),
  lobby: () => import('./lobby-screen'),
  role: () => import('./role-screen'),
  turns: () => import('./turns-screen'),
  voting: () => import('./voting-screen'),
  reveal: () => import('./reveal-screen'),
  result: () => import('./result-screen'),
};

// The socket comes first: start it while React is still hydrating (on a slow phone that is
// hundreds of ms before an effect runs). The screen chunks follow right after the first paint.
if (typeof window !== 'undefined') warmUpNetwork();

const MotionProvider = lazy(() => load.motion().then((m) => ({ default: m.MotionProvider })));
const JoinScreen = lazy(() => load.join().then((m) => ({ default: m.JoinScreen })));
const SpectatorScreen = lazy(() => load.join().then((m) => ({ default: m.SpectatorScreen })));
const LobbyScreen = lazy(() => load.lobby().then((m) => ({ default: m.LobbyScreen })));
const RoleScreen = lazy(() => load.role().then((m) => ({ default: m.RoleScreen })));
const TurnsScreen = lazy(() => load.turns().then((m) => ({ default: m.TurnsScreen })));
const DiscussionScreen = lazy(() => load.turns().then((m) => ({ default: m.DiscussionScreen })));
const VotingScreen = lazy(() => load.voting().then((m) => ({ default: m.VotingScreen })));
const RevealScreen = lazy(() => load.reveal().then((m) => ({ default: m.RevealScreen })));
const GuessScreen = lazy(() => load.reveal().then((m) => ({ default: m.GuessScreen })));
const ResultScreen = lazy(() => load.result().then((m) => ({ default: m.ResultScreen })));
const ScoreboardScreen = lazy(() => load.result().then((m) => ({ default: m.ScoreboardScreen })));

/** /room/[code] on a phone: connect, restore the seat or join, then follow the game phase. */
export function PlayerApp({ code }: { code: string }) {
  const stage = useGame((s) => s.stage);
  const view = useGame((s) => s.view);
  const enter = useGame((s) => s.enter);

  useEffect(() => {
    void enter(code);
  }, [code, enter]);

  useEffect(() => {
    for (const chunk of Object.values(load)) void chunk();
  }, []);

  // Phones must not sleep mid-round (§5).
  useWakeLock(stage === 'playing' && view !== null && view.phase !== 'LOBBY');
  // Browsers only start audio inside a tap; the host taps plenty before the first tick. Phones
  // with sound off never create an audio context at all.
  useAudioUnlock(useRoomSound());

  let screen: ReactNode = null;
  switch (stage) {
    case 'missing':
      return <MessageScreen title={mn.room.notFoundTitle} body={mn.room.notFoundBody} />;
    case 'kicked':
      return <MessageScreen title={mn.room.kicked} />;
    case 'expired':
      return <MessageScreen title={mn.room.expired} />;
    case 'join':
      screen = <JoinScreen code={code} />;
      break;
    case 'playing':
      if (view) screen = <PhaseScreen view={view} />;
      break;
  }
  const waiting = <ConnectingScreen code={code} />;
  // The server-rendered first paint stays plain HTML (no Suspense boundary to swap on hydration).
  if (!screen) return waiting;
  return (
    <Suspense fallback={waiting}>
      <MotionProvider>{screen}</MotionProvider>
    </Suspense>
  );
}

function PhaseScreen({ view }: { view: PlayerView }) {
  const me = playerById(view, view.me.id);
  if (view.phase === 'LOBBY') return <LobbyScreen view={view} />;
  // Late joiners watch the running game and play the next one (§2.5).
  if (!me?.inGame && ACTIVE_PHASES.includes(view.phase)) return <SpectatorScreen view={view} />;
  switch (view.phase) {
    case 'ROLE_REVEAL':
      return <RoleScreen view={view} />;
    case 'CLUE_TURNS':
      return <TurnsScreen view={view} />;
    case 'DISCUSSION':
      return <DiscussionScreen view={view} />;
    case 'VOTING':
      return <VotingScreen key={view.round?.revoteCandidates ? 'revote' : 'vote'} view={view} />;
    case 'VOTE_REVEAL':
      return <RevealScreen key={view.phaseStartedAt} view={view} />;
    case 'IMPOSTER_GUESS':
      return <GuessScreen view={view} />;
    case 'ROUND_RESULT':
      return <ResultScreen view={view} />;
    case 'SCOREBOARD':
      return <ScoreboardScreen view={view} />;
  }
}
