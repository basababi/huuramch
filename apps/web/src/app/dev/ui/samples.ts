import { ANIMAL_IDS } from '@/components/game/animals';
import type { PlayerSummary } from '@/components/game/player-tile';
import { avatarColor } from '@/design/tokens';

/** Sample names for the sandbox only — common first names, no real people. */
export const SAMPLE_NAMES = [
  'Бат',
  'Сараа',
  'Тэмүүлэн',
  'Номин',
  'Анужин',
  'Ганбаа',
  'Хулан',
  'Тэнгис',
  'Мишээл',
  'Эрдэнэ',
  'Солонго',
  'Дөлгөөн',
];

export function samplePlayer(i: number, extra: Partial<PlayerSummary> = {}): PlayerSummary {
  return {
    id: `p${i}`,
    name: SAMPLE_NAMES[i % SAMPLE_NAMES.length] ?? 'Бат',
    animal: ANIMAL_IDS[(i * 5) % ANIMAL_IDS.length] ?? 'mori',
    color: avatarColor(i),
    ...extra,
  };
}
