/**
 * The handful of strings the root error boundary needs. Next.js loads `app/error.tsx` on every
 * route, so it must not import the whole `mn` object — that would put all of the game's copy into
 * every page's initial JS a second time (DECISIONS D-310). `mn` re-exports these, so components
 * still read everything through `mn`.
 */
export const shellCopy = {
  errorTitle: 'Ямар нэг юм буруудлаа',
  errorBody: 'Дахин оролдоод үзээрэй. Өрөөнд байсан бол суудал чинь хадгалагдсан.',
  retry: 'Дахин оролдох',
  home: 'Нүүр хуудас руу',
} as const;
