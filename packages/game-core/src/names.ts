/**
 * Nickname rules (§2.5): 1–12 characters, Cyrillic (incl. Ө ө Ү ү) and Latin, a small Mongolian
 * + English blocklist, duplicates get a numeric suffix ("Бат 2").
 */
export const NAME_MAX = 12;

const ALLOWED = /^[0-9A-Za-zА-Яа-яЁёӨөҮү][0-9A-Za-zА-Яа-яЁёӨөҮү .\-_]*$/;

/**
 * Kept short on purpose: obvious slurs and swear words only. Matched against a normalised form
 * (lower case, letters only, Latin look-alikes folded to Cyrillic). Short roots that are also
 * parts of ordinary words are matched as whole words only.
 */
const BLOCK_SUBSTRING = [
  'пизд',
  'блят',
  'бляд',
  'ебат',
  'ебал',
  'сука',
  'новш',
  'янхан',
  'гичий',
  'хуйн',
  'pizd',
  'blyat',
  'suka',
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'whore',
  'slut',
  'nigg',
  'fagg',
  'dick',
  'pussy',
  'nazi',
];
const BLOCK_WORD = ['хуй', 'бля', 'сда', 'ass', 'fag'];

const LOOKALIKE: Record<string, string> = {
  a: 'а',
  e: 'е',
  o: 'о',
  p: 'р',
  c: 'с',
  y: 'у',
  x: 'х',
  k: 'к',
  m: 'м',
  t: 'т',
  b: 'в',
  h: 'н',
};
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't' };

export function normalizeName(raw: string): string {
  return raw.normalize('NFC').trim().replace(/\s+/g, ' ');
}

function folded(text: string): { latin: string; cyrillic: string } {
  const lower = [...text.toLowerCase().replace(/ё/g, 'е')].map((ch) => LEET[ch] ?? ch).join('');
  return {
    latin: lower,
    cyrillic: [...lower].map((ch) => LOOKALIKE[ch] ?? ch).join(''),
  };
}

export function isProfane(name: string): boolean {
  const { latin, cyrillic } = folded(name);
  const squashed = [latin.replace(/[^a-zа-яөү]/g, ''), cyrillic.replace(/[^a-zа-яөү]/g, '')];
  if (BLOCK_SUBSTRING.some((bad) => squashed.some((s) => s.includes(bad)))) return true;
  const words = [...latin.split(/[^a-zа-яөү]+/), ...cyrillic.split(/[^a-zа-яөү]+/)];
  return words.some((w) => BLOCK_WORD.includes(w));
}

export type NameCheck =
  { ok: true; name: string } | { ok: false; reason: 'length' | 'chars' | 'profane' };

export function checkName(raw: string): NameCheck {
  const name = normalizeName(raw);
  const length = [...name].length;
  if (length < 1 || length > NAME_MAX) return { ok: false, reason: 'length' };
  if (!ALLOWED.test(name)) return { ok: false, reason: 'chars' };
  if (isProfane(name)) return { ok: false, reason: 'profane' };
  return { ok: true, name };
}

/** "Бат" → "Бат 2" → "Бат 3" … when the room already has that name (case-insensitive). */
export function dedupeName(name: string, taken: readonly string[]): string {
  const lower = new Set(taken.map((t) => t.toLowerCase()));
  if (!lower.has(name.toLowerCase())) return name;
  let n = 2;
  while (lower.has(`${name} ${n}`.toLowerCase())) n++;
  return `${name} ${n}`;
}
