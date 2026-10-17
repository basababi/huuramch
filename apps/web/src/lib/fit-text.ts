'use client';

import { useLayoutEffect, useRef, useState } from 'react';

export type FitResult = { fontSize: number; wrap: boolean };

type FitInput = {
  /** Width available for the text, in px. */
  available: number;
  /** Width of the whole string on one line at `refSize`. */
  lineWidth: number;
  /** Width of the longest space-separated word at `refSize`. */
  longestWordWidth: number;
  refSize: number;
  min: number;
  max: number;
};

/**
 * Secret words (§6.3): as large as possible up to `max`, one line, never below `min`, never an
 * ellipsis. A phrase that cannot fit one line at `min` wraps at spaces instead. Only a single word
 * wider than the card at `min` may go below it — content validation (M2) keeps that from shipping.
 * Text width scales linearly with font size, so one measurement at a reference size is enough.
 */
export function computeFit({
  available,
  lineWidth,
  longestWordWidth,
  refSize,
  min,
  max,
}: FitInput): FitResult {
  if (available <= 0 || lineWidth <= 0) return { fontSize: max, wrap: false };
  const oneLine = Math.min(max, (available / lineWidth) * refSize);
  if (oneLine >= min || longestWordWidth >= lineWidth) {
    return { fontSize: round(oneLine), wrap: false };
  }
  const wrapped = Math.min(max, (available / longestWordWidth) * refSize);
  return { fontSize: round(wrapped), wrap: true };
}

function round(size: number): number {
  return Math.floor(size * 4) / 4;
}

const REF_SIZE = 100;
let canvas: HTMLCanvasElement | null = null;

function measure(text: string, fontWeight: string, fontFamily: string, letterSpacingEm: number) {
  canvas ??= document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  ctx.font = `${fontWeight} ${REF_SIZE}px ${fontFamily}`;
  const spacing = letterSpacingEm * REF_SIZE * Math.max(0, [...text].length - 1);
  return ctx.measureText(text).width + spacing;
}

/**
 * Measures `text` in the container's own font and returns the size that fits.
 * Re-runs when the container resizes and when web fonts finish loading.
 */
export function useFitText(
  text: string,
  { min, max, letterSpacingEm = 0 }: { min: number; max: number; letterSpacingEm?: number },
) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<FitResult>({ fontSize: max, wrap: false });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const style = getComputedStyle(el);
      const available =
        (el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)) * 0.97;
      const words = text.split(/\s+/).filter(Boolean);
      const lineWidth = measure(text, style.fontWeight, style.fontFamily, letterSpacingEm);
      const longestWordWidth = Math.max(
        0,
        ...words.map((w) => measure(w, style.fontWeight, style.fontFamily, letterSpacingEm)),
      );
      // Not laid out yet (stylesheet still loading, hidden parent): wait for the ResizeObserver.
      if (available < min * 2) return;
      const next = computeFit({
        available,
        lineWidth,
        longestWordWidth,
        refSize: REF_SIZE,
        min,
        max,
      });
      if (process.env.NODE_ENV !== 'production' && next.fontSize < min) {
        console.warn(`[fit-text] "${text}" only fits at ${next.fontSize}px (< ${min}px)`);
      }
      setFit((prev) => (prev.fontSize === next.fontSize && prev.wrap === next.wrap ? prev : next));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    const fonts = document.fonts;
    void fonts?.ready.then(update);
    fonts?.addEventListener?.('loadingdone', update);
    return () => {
      observer.disconnect();
      fonts?.removeEventListener?.('loadingdone', update);
    };
  }, [text, min, max, letterSpacingEm]);

  return { ref, ...fit };
}
