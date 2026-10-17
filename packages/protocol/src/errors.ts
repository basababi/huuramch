import type { GameErrorCode } from '@khuuramch/game-core';

/** Everything the server can answer with: game rule errors plus transport/room errors. */
export type ErrorCode =
  | GameErrorCode
  | 'ROOM_NOT_FOUND'
  | 'ROOM_EXPIRED'
  | 'NAME_LENGTH'
  | 'NAME_CHARS'
  | 'NAME_PROFANE'
  | 'SESSION_INVALID'
  | 'RATE_LIMITED'
  | 'VALIDATION_FAILED'
  | 'INTERNAL';

/** Mongolian messages sent with every error (§3.2). Informal "чи", short. */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  ROOM_NOT_FOUND: 'Ийм кодтой өрөө олдсонгүй',
  ROOM_EXPIRED: 'Өрөөний хугацаа дууссан',
  ROOM_FULL: 'Өрөө дүүрчихсэн байна. 12-оос олон хүн тоглох боломжгүй',
  AVATAR_TAKEN: 'Энэ амьтныг өөр хүн сонгочихсон. Өөрийг сонго',
  NAME_INVALID: 'Нэр 1–12 тэмдэгт, үсэг тоогоор',
  NAME_LENGTH: 'Нэр 1–12 тэмдэгт байх ёстой',
  NAME_CHARS: 'Нэрэнд зөвхөн үсэг, тоо ашиглаарай',
  NAME_PROFANE: 'Өөр нэр сонгоорой',
  SESSION_INVALID: 'Холболт хуучирсан байна. Дахин нэгдээрэй',
  NOT_A_PLAYER: 'Чи энэ өрөөнд алга',
  NOT_HOST: 'Үүнийг зөвхөн хөтлөгч хийнэ',
  NOT_ALLOWED: 'Одоохондоо болохгүй',
  INVALID_PHASE: 'Одоо энэ үйлдлийн үе биш',
  NOT_ENOUGH_PLAYERS: 'Дор хаяж 3 тоглогч хэрэгтэй',
  INVALID_SETTINGS: 'Тохиргоо буруу байна',
  INVALID_TARGET: 'Ийм сонголт хийх боломжгүй',
  ALREADY_VOTED: 'Чи аль хэдийн санал өгсөн',
  NOT_YOUR_TURN: 'Одоо чиний ээлж биш',
  NO_CONTENT: 'Сонгосон ангилалд үг алга',
  RATE_LIMITED: 'Арай удаан. Хэт олон товшлоо',
  VALIDATION_FAILED: 'Буруу хүсэлт',
  INTERNAL: 'Алдаа гарлаа. Дахин оролдоорой',
};

export type AckError = { code: ErrorCode; message: string };

/** Every client → server event is acknowledged with this envelope. */
export type Ack<T> = { ok: true; data: T } | { ok: false; error: AckError };

export function ackError(code: ErrorCode): { ok: false; error: AckError } {
  return { ok: false, error: { code, message: ERROR_MESSAGES[code] } };
}
