'use client';

import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import { mn } from '@/i18n/mn';
import { Button, ButtonLink } from '../ui/button';
import { CodeInput } from '../ui/code-input';
import { Icon } from '../ui/icon';
import { arrowRight, plus, signIn } from '../ui/icon-data';

/** Home's two primary actions, pinned in thumb reach. "Нэгдэх" opens the code input inline. */
export function HomeActions() {
  const router = useRouter();
  const hintId = useId();
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');

  const go = (value: string) => {
    if (value.length === 4) router.push(`/room/${value}`);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* prefetch off until /create exists (M4); then drop it and enable typedRoutes. */}
      <ButtonLink
        href="/create"
        prefetch={false}
        tone="primary"
        size="lg"
        block
        iconStart={<Icon icon={plus} />}
      >
        {mn.home.create}
      </ButtonLink>
      {joining ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            go(code);
          }}
        >
          <CodeInput
            label={mn.home.codeLabel}
            value={code}
            onChange={setCode}
            autoFocus
            describedBy={hintId}
          />
          <p id={hintId} className="text-sm font-medium text-fg-muted">
            {mn.home.codeHint}
          </p>
          <Button
            type="submit"
            tone="highlight"
            size="lg"
            block
            disabled={code.length !== 4}
            iconEnd={<Icon icon={arrowRight} />}
          >
            {mn.home.enter}
          </Button>
        </form>
      ) : (
        <Button
          tone="secondary"
          size="lg"
          block
          onClick={() => setJoining(true)}
          iconStart={<Icon icon={signIn} />}
        >
          {mn.home.join}
        </Button>
      )}
    </div>
  );
}
