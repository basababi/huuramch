import type { PublicPlayer, PublicView, SecretView } from '@khuuramch/game-core';
import { avatarColor } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import type { PlayerSummary } from '../game/player-tile';
import type { RoleCardContent } from '../game/role-card';

export function playerById(
  view: PublicView,
  id: string | null | undefined,
): PublicPlayer | undefined {
  return id ? view.players.find((p) => p.id === id) : undefined;
}

export function nameOf(view: PublicView, id: string | null | undefined): string {
  return playerById(view, id)?.name ?? '';
}

export function summary(player: PublicPlayer): PlayerSummary {
  return {
    id: player.id,
    name: player.name,
    animal: player.animal,
    color: avatarColor(player.seat),
    isHost: player.isHost,
    eliminated: player.eliminated,
  };
}

/** Players still in this game (not eliminated, not gone). */
export function alivePlayers(view: PublicView): PublicPlayer[] {
  return view.players.filter((p) => p.inGame && !p.eliminated && !p.absent);
}

export function cardContent(secret: SecretView, mode: 'A' | 'B'): RoleCardContent {
  if (mode === 'B') return { mode: 'B', word: secret.kind === 'word' ? secret.word : '' };
  if (secret.kind === 'imposter') {
    return {
      mode: 'A',
      role: 'imposter',
      category: secret.category ? mn.categories[secret.category] : null,
    };
  }
  return {
    mode: 'A',
    role: 'civilian',
    word: secret.word,
    category: secret.category ? mn.categories[secret.category] : '',
  };
}
