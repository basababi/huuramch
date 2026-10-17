/** Client → server events (CLAUDE.md §3.2 plus the extras listed in PLAN.md §4). */
export const C2S = {
  roomCreate: 'room:create',
  roomJoin: 'room:join',
  roomRejoin: 'room:rejoin',
  roomLeave: 'room:leave',
  roomUpdateSettings: 'room:updateSettings',
  roomKick: 'room:kick',
  gameStart: 'game:start',
  roleConfirm: 'role:confirm',
  roleForce: 'role:force',
  turnDone: 'turn:done',
  discussionSkip: 'discussion:skip',
  voteCast: 'vote:cast',
  guessSubmit: 'guess:submit',
  roundContinue: 'round:continue',
  gameReplay: 'game:replay',
  tvWatch: 'tv:watch',
  clockPing: 'clock:ping',
} as const;

/** Server → client events. */
export const S2C = {
  stateSync: 'state:sync',
  error: 'error',
  kicked: 'room:kicked',
} as const;

export type ClientEvent = (typeof C2S)[keyof typeof C2S];
export type ServerEvent = (typeof S2C)[keyof typeof S2C];
