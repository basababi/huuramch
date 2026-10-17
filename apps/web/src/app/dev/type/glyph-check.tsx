'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { check, x } from '@/components/ui/icon-data';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';

export type FontSpec = {
  label: string;
  /** CSS font-family list from next/font (`font.style.fontFamily`). */
  family: string;
  weights: number[];
  role: string;
  /** False for fonts shown only as evidence (the rejected display face). */
  counted?: boolean;
};

const GLYPHS = ['Ө', 'ө', 'Ү', 'ү'] as const;

type Result = { glyphs: Record<string, boolean>; tabular: boolean };

function primaryFamily(family: string): string {
  return family.split(',')[0]?.trim() ?? family;
}

/**
 * A glyph is present when it measures the same whatever fallback follows the font: if the font
 * lacked it, "X, monospace" and "X, serif" would fall back to two different faces.
 */
function hasGlyph(ctx: CanvasRenderingContext2D, primary: string, weight: number, ch: string) {
  const widthWith = (fallback: string) => {
    ctx.font = `${weight} 64px ${primary}, ${fallback}`;
    return ctx.measureText(ch).width;
  };
  const mono = widthWith('monospace');
  return mono === widthWith('serif') && mono === widthWith('cursive');
}

/** Tabular numerals: "1111" and "0000" must be equally wide with tabular-nums on. */
function hasTabular(primary: string, weight: number) {
  const measure = (text: string) => {
    const span = document.createElement('span');
    span.textContent = text;
    span.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${weight} 64px ${primary};font-variant-numeric:tabular-nums;`;
    document.body.appendChild(span);
    const width = span.getBoundingClientRect().width;
    span.remove();
    return width;
  };
  return Math.abs(measure('1111') - measure('0000')) < 0.5;
}

export function GlyphCheck({ fonts }: { fonts: FontSpec[] }) {
  const [results, setResults] = useState<Record<string, Result> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ctx = document.createElement('canvas').getContext('2d');
      if (!ctx) return;
      const out: Record<string, Result> = {};
      for (const font of fonts) {
        const primary = primaryFamily(font.family);
        for (const weight of font.weights) {
          await document.fonts.load(`${weight} 64px ${primary}`, `${GLYPHS.join('')}0123456789`);
          const glyphs = Object.fromEntries(
            GLYPHS.map((g) => [g, hasGlyph(ctx, primary, weight, g)]),
          );
          out[`${font.label}-${weight}`] = { glyphs, tabular: hasTabular(primary, weight) };
        }
      }
      if (!cancelled) setResults(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [fonts]);

  const allGlyphsPass =
    results !== null &&
    fonts
      .filter((font) => font.counted !== false)
      .every((font) =>
        font.weights.every((weight) => {
          const result = results[`${font.label}-${weight}`];
          return result !== undefined && Object.values(result.glyphs).every(Boolean);
        }),
      );

  return (
    <div className="flex flex-col gap-4">
      <p
        role="status"
        data-glyph-summary={results === null ? 'pending' : allGlyphsPass ? 'pass' : 'fail'}
        className={cn(
          'self-start rounded-card px-4 py-2 text-base font-bold lift-sm ink-border',
          results === null
            ? 'bg-raised'
            : allGlyphsPass
              ? 'bg-nogoon text-ink'
              : 'bg-al text-paper',
        )}
      >
        {results === null
          ? mn.dev.glyphChecking
          : allGlyphsPass
            ? mn.dev.glyphPass
            : mn.dev.glyphFail}
      </p>
      <div className="overflow-x-auto rounded-card bg-raised ink-border">
        <table className="w-full min-w-[34rem] border-collapse text-left text-[0.9375rem]">
          <thead>
            <tr className="border-b-[length:var(--stroke)] border-line">
              <th className="px-3 py-2 font-bold">Font</th>
              <th className="px-3 py-2 tabular font-bold">wght</th>
              {GLYPHS.map((g) => (
                <th key={g} className="px-3 py-2 font-bold">
                  {g}
                </th>
              ))}
              <th className="px-3 py-2 font-bold">{mn.dev.tabular}</th>
            </tr>
          </thead>
          <tbody>
            {fonts.flatMap((font) =>
              font.weights.map((weight) => {
                const result = results?.[`${font.label}-${weight}`];
                const pass = result ? Object.values(result.glyphs).every(Boolean) : undefined;
                return (
                  <tr
                    key={`${font.label}-${weight}`}
                    data-glyph-row={`${font.label}-${weight}`}
                    data-glyph-result={pass === undefined ? 'pending' : pass ? 'pass' : 'fail'}
                    data-glyph-counted={font.counted !== false}
                    className="border-b-2 border-dashed border-line last:border-b-0"
                  >
                    <td className="px-3 py-2 font-semibold">
                      {font.label} <span className="text-fg-muted">· {font.role}</span>
                    </td>
                    <td className="px-3 py-2 tabular">{weight}</td>
                    {GLYPHS.map((g) => (
                      <td key={g} className="px-3 py-2">
                        <Verdict ok={result?.glyphs[g]} />
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <Verdict ok={result?.tabular} />
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Verdict({ ok }: { ok: boolean | undefined }) {
  if (ok === undefined) return <span className="text-fg-muted">…</span>;
  return (
    <span className="inline-flex items-center gap-1 font-bold">
      <Icon icon={ok ? check : x} size={18} className={ok ? 'text-nogoon' : 'text-al'} />
      {ok ? mn.dev.glyphPass : mn.dev.glyphFail}
    </span>
  );
}
