'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { arrowLeft, replay } from '@/components/ui/icon-data';
import { shellCopy } from '@/i18n/mn-shell';

/** Something threw while rendering: say so in Mongolian and offer a retry (the seat survives). */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col justify-center gap-5 px-4 py-8">
      <h1 className="font-display text-[2rem] leading-tight font-extrabold">
        {shellCopy.errorTitle}
      </h1>
      <p className="text-lg font-medium text-fg-muted">{shellCopy.errorBody}</p>
      <div className="mt-4 flex flex-col gap-3">
        <Button block iconStart={<Icon icon={replay} />} onClick={reset}>
          {shellCopy.retry}
        </Button>
        <ButtonLink href="/" tone="secondary" block iconStart={<Icon icon={arrowLeft} />}>
          {shellCopy.home}
        </ButtonLink>
      </div>
    </main>
  );
}
