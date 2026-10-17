'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { mn } from '@/i18n/mn';
import { IconButton } from './icon-button';
import { x } from './icon-data';

/**
 * Bottom sheet on a native <dialog>: focus trapping, Esc and the top layer come from the browser.
 * The backdrop is a flat ink wash — no blur (§6.7.3).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-x-0 top-auto bottom-0 m-0 mx-auto max-h-[88dvh] w-full max-w-[30rem] overflow-y-auto rounded-t-card border-[length:var(--stroke)] border-b-0 border-line bg-surface p-0 text-fg backdrop:bg-ink/70 tv:top-1/2 tv:bottom-auto tv:-translate-y-1/2 tv:rounded-card tv:border-b-[length:var(--stroke)]"
    >
      <div className="flex flex-col gap-5 px-4 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="font-display text-[1.375rem] leading-tight font-extrabold">
            {title}
          </h2>
          <IconButton icon={x} label={mn.common.close} onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  );
}
