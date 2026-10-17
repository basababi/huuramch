import type { CategoryId, LockedPackId, WordPair } from '@khuuramch/game-core';
import widthsJson from '../data/rubik-800-widths.json';
import core from '../packs/core.v1.json';
import premium from '../packs/premium.v1.json';
import type { WordPack } from './validate';

export { CARD_MAX_WORD_EM, emWidth, validatePack, type Issue, type WordPack } from './validate';

/** The free, playable pack (§4). Versioned: bump `version` and add a new file for big edits. */
export const CORE_PACK = core as WordPack;

/** Visible but locked (§9). Metadata only — no words ship for them yet. */
export const PREMIUM_PACKS = premium.packs as Array<{
  id: LockedPackId;
  name: string;
  locked: true;
}>;

/** Rubik 800 advance widths in em (see scripts/font-widths.py). */
export const RUBIK_800_WIDTHS: Record<string, number> = widthsJson.widths;

export const CATEGORY_NAMES: Record<CategoryId, string> = {
  food: 'Монгол хоол',
  places: 'Газар орон',
  animals: 'Амьтан',
  daily: 'Өдөр тутам',
  arts: 'Хөгжим ба урлаг',
  sports: 'Спорт ба тоглоом',
};

/** Every playable pair. */
export function playablePairs(): WordPair[] {
  return CORE_PACK.pairs;
}
