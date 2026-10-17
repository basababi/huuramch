import type { AnimalId, CategoryId, TimerPreset } from './constants';

export type Mode = 'A' | 'B';
export type Role = 'civilian' | 'imposter';
export type Team = 'civilians' | 'imposters';

export type Phase =
  | 'LOBBY'
  | 'ROLE_REVEAL'
  | 'CLUE_TURNS'
  | 'DISCUSSION'
  | 'VOTING'
  | 'VOTE_REVEAL'
  | 'IMPOSTER_GUESS'
  | 'ROUND_RESULT'
  | 'SCOREBOARD';

/** Random number in [0, 1). Injected so every transition is deterministic in tests. */
export type Rng = () => number;

export type WordPair = {
  id: string;
  /** Civilians' word (Mode B) / the word (Mode A). */
  a: string;
  /** Imposter's word (Mode B). */
  b: string;
  category: CategoryId;
  difficulty: 1 | 2 | 3;
  packId: string;
};

export type RoomSettings = {
  mode: Mode;
  /** At least one free category. */
  categories: CategoryId[];
  /** `auto`: 1 for 3–6 players, 2 for 7–12. Always fewer than half the players. */
  imposterCount: 'auto' | 1 | 2 | 3;
  /** Mode A: the imposter sees the category. */
  showCategoryHint: boolean;
  timerPreset: TimerPreset;
  /** Optional per-turn timer during clue turns. */
  turnTimer: boolean;
};

export type PlayerStats = {
  /** Points earned while an imposter ("Шилдэг худалч"). */
  imposterPoints: number;
  /** Votes cast for an actual imposter ("Мөрдөгч"). */
  correctVotes: number;
  /** Times eliminated while a civilian ("Гэм буруугүй хохирогч"). */
  civilianEliminations: number;
};

export type Player = {
  id: string;
  name: string;
  animal: AnimalId;
  /** Stable index 0–11: the avatar colour. */
  seat: number;
  joinedAt: number;
  connected: boolean;
  disconnectedAt: number | null;
  /** Left on purpose; removed when the room is back in the lobby. */
  left: boolean;
  /** Late joiner: watches the current game, plays from the next one (§2.5). */
  waiting: boolean;
  score: number;
  stats: PlayerStats;
};

export type VoteReveal = {
  /** Votes per target, for stacking onto avatars. Voters stay secret. */
  tally: Record<string, number>;
  eliminatedId: string | null;
  eliminatedRole: Role | null;
  /** A tie that leads to a re-vote between `candidates`. */
  tie: boolean;
  candidates: string[];
  /** Second tie (or nobody voted): no one leaves. */
  noElimination: boolean;
};

export type Guess = {
  guesserId: string;
  options: string[];
  choice: number | null;
  correct: boolean | null;
};

export type Result = {
  winner: Team;
  reason:
    | 'imposter-hidden'
    | 'no-elimination'
    | 'guessed-word'
    | 'missed-word'
    | 'all-imposters-out'
    | 'imposters-outnumber'
    | 'stalemate';
};

export type Round = {
  /** 1-based game number in this room. */
  number: number;
  mode: Mode;
  pairId: string;
  category: CategoryId;
  wordA: string;
  wordB: string;
  /** Category words the guess distractors are drawn from. */
  categoryWords: string[];
  participants: string[];
  imposters: string[];
  eliminated: string[];
  confirmed: string[];
  speakingOrder: string[];
  turnIndex: number;
  totalLaps: number;
  /** voterId → targetId for the current vote. */
  votes: Record<string, string>;
  /** Set while a re-vote between tied players is pending or running. */
  revoteCandidates: string[] | null;
  reveal: VoteReveal | null;
  guess: Guess | null;
  result: Result | null;
  roundsWithoutElimination: number;
  /** Points and stats earned this game; applied only when it ends (a void game earns nothing). */
  points: Record<string, number>;
  stats: Record<string, PlayerStats>;
  startedAt: number;
};

export type RoomState = {
  code: string;
  hostId: string;
  settings: RoomSettings;
  /** Join order. */
  players: Player[];
  phase: Phase;
  phaseStartedAt: number;
  /** When the current phase (or turn) times out; null when it waits for people. */
  deadline: number | null;
  round: Round | null;
  gamesPlayed: number;
  usedPairIds: string[];
  /** Shown once in the lobby after a game is voided (§2.5). */
  notice: 'round-voided' | null;
  lastActivityAt: number;
};

export type NewPlayer = { id: string; name: string; animal: AnimalId };

export type Action =
  | { type: 'JOIN'; player: NewPlayer }
  | { type: 'LEAVE'; playerId: string }
  | { type: 'DISCONNECT'; playerId: string }
  | { type: 'RECONNECT'; playerId: string }
  | { type: 'KICK'; by: string; playerId: string }
  | { type: 'UPDATE_SETTINGS'; by: string; settings: Partial<RoomSettings> }
  | { type: 'START_GAME'; by: string; pool: WordPair[] }
  | { type: 'CONFIRM_ROLE'; playerId: string }
  | { type: 'FORCE_ROLES'; by: string }
  | { type: 'TURN_DONE'; by: string }
  | { type: 'SKIP_DISCUSSION'; by: string }
  | { type: 'CAST_VOTE'; playerId: string; targetId: string }
  | { type: 'SUBMIT_GUESS'; playerId: string; optionIndex: number }
  | { type: 'CONTINUE'; by: string }
  | { type: 'REPLAY'; by: string }
  | { type: 'TICK' };

export type GameErrorCode =
  | 'ROOM_FULL'
  | 'AVATAR_TAKEN'
  | 'NAME_INVALID'
  | 'NOT_A_PLAYER'
  | 'NOT_HOST'
  | 'NOT_ALLOWED'
  | 'INVALID_PHASE'
  | 'NOT_ENOUGH_PLAYERS'
  | 'INVALID_SETTINGS'
  | 'INVALID_TARGET'
  | 'ALREADY_VOTED'
  | 'NOT_YOUR_TURN'
  | 'NO_CONTENT';

/** Anonymous analytics facts emitted by transitions (§8). No names, no ids of people. */
export type GameEvent =
  | {
      type: 'game_started';
      mode: Mode;
      players: number;
      imposters: number;
      categories: CategoryId[];
    }
  | { type: 'round_completed'; mode: Mode; winner: Team; durationMs: number; players: number }
  | { type: 'round_voided' }
  | { type: 'game_replayed' };

export type ReduceResult =
  | { ok: true; state: RoomState; events: GameEvent[] }
  | { ok: false; error: GameErrorCode; state: RoomState };
