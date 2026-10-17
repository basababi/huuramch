'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * QR for the join link. `qrcode` is loaded only on the host's lobby and the TV, never on players'
 * phones. Always ink on paper, whatever the theme: scanners need dark modules on a light field.
 */
export function QrCode({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('qrcode').then((QR) =>
      QR.toString(value, {
        type: 'svg',
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#141414', light: '#fafaf7' },
      }).then((markup) => {
        if (!cancelled) setSvg(markup);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        'aspect-square overflow-hidden rounded-card bg-paper p-2 lift ink-border [&_svg]:size-full',
        className,
      )}
      // Markup generated locally by `qrcode` from our own URL.
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  );
}
