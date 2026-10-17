import type { Metadata } from 'next';
import { Golos_Text, Unbounded } from 'next/font/google';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { mn } from '@/i18n/mn';
import { fontBody, fontDisplay } from '../../fonts';
import { GlyphCheck, type FontSpec } from './glyph-check';

export const metadata: Metadata = {
  title: mn.dev.typeTitle,
  robots: { index: false, follow: false },
};

/*
 * Loaded on this page only: Golos Text (the spec's first UI fallback) for comparison, and
 * Unbounded — the spec's display face — kept here as the evidence for why it was replaced.
 */
// `preload: false`: the font CSS is shared across routes, so a preload here would make every page
// download these two evidence faces (~145 KB) up front.
const golos = Golos_Text({
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  display: 'swap',
  preload: false,
});
const unbounded = Unbounded({
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  display: 'swap',
  preload: false,
});

const FONTS: FontSpec[] = [
  {
    label: 'Rubik',
    family: fontDisplay.style.fontFamily,
    weights: [700, 800, 900],
    role: 'display',
  },
  {
    label: 'Onest',
    family: fontBody.style.fontFamily,
    weights: [400, 500, 600, 700],
    role: 'body',
  },
  {
    label: 'Golos Text',
    family: golos.style.fontFamily,
    weights: [400, 500, 600, 700],
    role: 'fallback',
  },
  {
    label: 'Unbounded',
    family: unbounded.style.fontFamily,
    weights: [800, 900],
    role: mn.dev.rejected,
    counted: false,
  },
];

export default function DevTypePage() {
  return (
    <main className="mx-auto flex w-full max-w-[30rem] flex-col gap-10 px-4 py-6 tv:max-w-[90rem] tv:px-12 tv:py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-bold tracking-[0.12em] text-fg-muted uppercase">/dev/type</p>
          <h1 className="font-display text-[1.75rem] leading-tight font-extrabold tv:text-[2.5rem]">
            {mn.dev.typeTitle}
          </h1>
          <p className="text-base text-fg-muted">{mn.dev.typeIntro}</p>
        </div>
        <ThemeToggle />
      </header>

      <GlyphCheck fonts={FONTS} />

      {FONTS.map((font) => (
        <section key={font.label} className="flex flex-col gap-3" data-font={font.label}>
          <h2 className="flex items-center gap-3 font-display text-[1.25rem] font-extrabold">
            <span aria-hidden className="h-[var(--stroke)] w-6 bg-line" />
            {font.label}{' '}
            <span className="font-sans text-base font-semibold text-fg-muted">· {font.role}</span>
          </h2>
          {font.weights.map((weight) => (
            <div
              key={weight}
              className="flex flex-col gap-0.5 border-b-2 border-dashed border-line pb-3"
            >
              <span className="tabular text-xs font-bold text-fg-muted">{weight}</span>
              <p
                className={
                  font.role === 'display'
                    ? 'text-[1.75rem] leading-tight tv:text-[2.5rem]'
                    : 'text-[1.375rem] leading-snug tv:text-[1.75rem]'
                }
                style={{ fontFamily: font.family, fontWeight: weight }}
              >
                {mn.dev.glyphLine}
              </p>
              <p
                className="tabular text-lg"
                style={{ fontFamily: font.family, fontWeight: weight }}
              >
                0123456789 · 1111 · 0000
              </p>
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
