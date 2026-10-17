import type { AnimalId, CategoryId } from './constants';
import { currentSpeakerId } from './machine';
import { isAbsent } from './players';
import type {
  Phase,
  Player,
  Result,
  Role,
  RoomSettings,
  RoomState,
  Round,
  Team,
  VoteReveal,
} from './types';

/** What one player's own phone may show about their secret (§2.2, §2.3). */
export type SecretView =
  | { kind: 'word'; word: string; category: CategoryId | null }
  | { kind: 'imposter'; category: CategoryId | null };

export type PublicPlayer = {
  id: string;
  name: string;
  animal: AnimalId;
  seat: number;
  isHost: boolean;
  connected: boolean;
  /** Left or gone past the grace period. */
  absent: boolean;
  /** Late joiner watching this game. */
  waiting: boolean;
  inGame: boolean;
  eliminated: boolean;
  /** Revealed role: after this player's elimination stamp, or for everyone once the game ends. */
  role: Role | null;
  score: number;
  confirmed: boolean;
  voted: boolean;
};

export type PublicRound = {
  number: number;
  mode: 'A' | 'B';
  imposterCount: number;
  speakingOrder: string[];
  turnIndex: number;
  currentSpeakerId: string | null;
  lap: number;
  totalLaps: number;
  votesCast: number;
  votersTotal: number;
  revoteCandidates: string[] | null;
  reveal: VoteReveal | null;
  guess: { guesserId: string; correct: boolean | null } | null;
  result: {
    winner: Team;
    reason: Result['reason'];
    category: CategoryId;
    wordA: string;
    /** Mode B only: the imposters' word, shown side by side at the end (§2.3.7). */
    wordB: string | null;
    imposterIds: string[];
    points: Record<string, number>;
  } | null;
};

export type Titles = { liar: string | null; detective: string | null; victim: string | null };

export type PublicView = {
  code: string;
  phase: Phase;
  phaseStartedAt: number;
  deadline: number | null;
  hostId: string;
  settings: RoomSettings;
  players: PublicPlayer[];
  round: PublicRound | null;
  gamesPlayed: number;
  notice: RoomState['notice'];
  titles: Titles | null;
};

export type MeView = {
  id: string;
  isHost: boolean;
  secret: SecretView | null;
  myVote: string | null;
  /** Only the eliminated imposter ever receives the eight options. */
  guessOptions: string[] | null;
  guessChoice: number | null;
};

export type PlayerView = PublicView & { me: MeView };
export type TvView = PublicView & { me: null };

const ENDED: readonly Phase[] = ['ROUND_RESULT', 'SCOREBOARD'];

function revealedRole(state: RoomState, r: Round | null, p: Player): Role | null {
  if (!r || !r.participants.includes(p.id)) return null;
  const imposter = r.imposters.includes(p.id);
  if (ENDED.includes(state.phase) || r.eliminated.includes(p.id)) {
    return imposter ? 'imposter' : 'civilian';
  }
  return null;
}

/** Highest stat wins; ties go to whoever joined first; zero means nobody gets the title. */
function bestBy(players: readonly Player[], key: keyof Player['stats']): string | null {
  let best: Player | null = null;
  for (const p of players) {
    if (p.stats[key] > 0 && (!best || p.stats[key] > best.stats[key])) best = p;
  }
  return best?.id ?? null;
}

export function computeTitles(players: readonly Player[]): Titles {
  return {
    liar: bestBy(players, 'imposterPoints'),
    detective: bestBy(players, 'correctVotes'),
    victim: bestBy(players, 'civilianEliminations'),
  };
}

function publicRound(state: RoomState, r: Round, now: number): PublicRound {
  const alive = r.participants.filter((id) => !r.eliminated.includes(id));
  const voters = alive.filter((id) => {
    const p = state.players.find((x) => x.id === id);
    return p !== undefined && !isAbsent(p, now);
  });
  const ended = ENDED.includes(state.phase) && r.result !== null;
  return {
    number: r.number,
    mode: r.mode,
    imposterCount: r.imposters.length,
    speakingOrder: [...r.speakingOrder],
    turnIndex: r.turnIndex,
    currentSpeakerId: state.phase === 'CLUE_TURNS' ? currentSpeakerId(r) : null,
    lap: r.speakingOrder.length ? Math.floor(r.turnIndex / r.speakingOrder.length) + 1 : 1,
    totalLaps: r.totalLaps,
    votesCast: Object.keys(r.votes).length,
    votersTotal: voters.length,
    revoteCandidates: r.revoteCandidates ? [...r.revoteCandidates] : null,
    reveal: r.reveal ? structuredClone(r.reveal) : null,
    guess: r.guess ? { guesserId: r.guess.guesserId, correct: r.guess.correct } : null,
    result:
      ended && r.result
        ? {
            winner: r.result.winner,
            reason: r.result.reason,
            category: r.category,
            wordA: r.wordA,
            wordB: r.mode === 'B' ? r.wordB : null,
            imposterIds: [...r.imposters],
            points: { ...r.points },
          }
        : null,
  };
}

/** Everything that may be shown on a shared screen. Never contains words or hidden roles. */
export function projectStateForTv(state: RoomState, now: number): TvView {
  const r = state.round;
  return {
    code: state.code,
    phase: state.phase,
    phaseStartedAt: state.phaseStartedAt,
    deadline: state.deadline,
    hostId: state.hostId,
    settings: structuredClone(state.settings),
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      animal: p.animal,
      seat: p.seat,
      isHost: p.id === state.hostId,
      connected: p.connected,
      absent: isAbsent(p, now),
      waiting: p.waiting,
      inGame: r?.participants.includes(p.id) ?? false,
      eliminated: r?.eliminated.includes(p.id) ?? false,
      role: revealedRole(state, r, p),
      score: p.score,
      confirmed: state.phase === 'ROLE_REVEAL' && (r?.confirmed.includes(p.id) ?? false),
      voted: state.phase === 'VOTING' && r !== null && p.id in r.votes,
    })),
    round: r ? publicRound(state, r, now) : null,
    gamesPlayed: state.gamesPlayed,
    notice: state.notice,
    titles: state.phase === 'SCOREBOARD' ? computeTitles(state.players) : null,
    me: null,
  };
}

function secretFor(state: RoomState, r: Round, playerId: string): SecretView | null {
  if (state.phase === 'LOBBY' || !r.participants.includes(playerId)) return null;
  const imposter = r.imposters.includes(playerId);
  if (r.mode === 'B') {
    // Identical shape for both roles: nobody learns their role from the payload (§2.3.2).
    return { kind: 'word', word: imposter ? r.wordB : r.wordA, category: null };
  }
  if (imposter) {
    return { kind: 'imposter', category: state.settings.showCategoryHint ? r.category : null };
  }
  return { kind: 'word', word: r.wordA, category: r.category };
}

/** `projectStateForPlayer` (§3.1): only what this player may see, nothing about anyone else's secret. */
export function projectStateForPlayer(state: RoomState, playerId: string, now: number): PlayerView {
  const tv = projectStateForTv(state, now);
  const r = state.round;
  const guess = r?.guess && r.guess.guesserId === playerId ? r.guess : null;
  return {
    ...tv,
    me: {
      id: playerId,
      isHost: state.hostId === playerId,
      secret: r ? secretFor(state, r, playerId) : null,
      myVote: state.phase === 'VOTING' ? (r?.votes[playerId] ?? null) : null,
      guessOptions: state.phase === 'IMPOSTER_GUESS' && guess ? [...guess.options] : null,
      guessChoice: state.phase === 'IMPOSTER_GUESS' && guess ? guess.choice : null,
    },
  };
}
