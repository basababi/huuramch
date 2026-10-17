import type { Metadata } from 'next';
import Link from 'next/link';
import { ModeIllustration } from '@/components/game/mode-card';
import { RULE_PANELS, RuleArt } from '@/components/rules/rule-art';
import { ButtonLink, buttonClass } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { arrowLeft, play } from '@/components/ui/icon-data';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { mn } from '@/i18n/mn';
import { cn } from '@/lib/cn';

export const metadata: Metadata = { title: mn.rules.title };

/** /rules (§5.11): four illustrated steps, readable in under 30 seconds. Details below the fold. */
export default function RulesPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col tv:max-w-[60rem]">
      <header className="flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Link
          href="/"
          aria-label={mn.common.back}
          className={buttonClass({ tone: 'secondary', size: 'none', className: 'size-12' })}
        >
          <Icon icon={arrowLeft} />
        </Link>
        <h1 className="font-display text-[1.375rem] font-extrabold">{mn.rules.title}</h1>
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col gap-8 px-4 py-6">
        <p className="text-lg font-semibold text-fg-muted">{mn.rules.intro}</p>

        <ol className="grid gap-4 tv:grid-cols-2 tv:gap-6">
          {mn.rules.steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-3 rounded-card bg-raised p-4 lift ink-border"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-pill bg-alt font-display tabular text-[1.25rem] font-black text-ink ink-border">
                  {index + 1}
                </span>
                <h2 className="font-display text-[1.25rem] leading-tight font-extrabold">
                  {step.title}
                </h2>
              </div>
              <div className={cn('rounded-[8px] p-2 ink-border', RULE_PANELS[index])}>
                <RuleArt step={index} className="mx-auto h-24 w-auto" />
              </div>
              <p className="text-base leading-snug font-medium">{step.body}</p>
            </li>
          ))}
        </ol>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
            {mn.rules.modes}
          </h2>
          <ul className="grid gap-3 tv:grid-cols-2">
            {(['A', 'B'] as const).map((mode) => (
              <li
                key={mode}
                className="flex items-center gap-4 rounded-card bg-raised p-3 ink-border"
              >
                <span
                  className={cn(
                    'grid w-24 shrink-0 place-items-center rounded-[8px] p-1 ink-border',
                    mode === 'A' ? 'bg-alt' : 'bg-nogoon',
                  )}
                >
                  <ModeIllustration mode={mode} className="h-auto w-full" />
                </span>
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-display text-[1.0625rem] leading-tight font-extrabold">
                    {mn.modes[mode].title}
                  </span>
                  <span className="text-[0.9375rem] leading-snug font-medium text-fg-muted">
                    {mn.modes[mode].blurb}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
            {mn.rules.scoring}
          </h2>
          <ul className="flex flex-col gap-2">
            {mn.rules.points.map((line) => (
              <li key={line} className="flex items-start gap-3 text-base font-semibold">
                <span aria-hidden className="mt-2 size-2.5 shrink-0 rounded-pill bg-fg" />
                {line}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <div className="sticky bottom-0 border-t-[length:var(--stroke)] border-line bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <ButtonLink href="/" block iconStart={<Icon icon={play} />}>
          {mn.rules.play}
        </ButtonLink>
      </div>
    </div>
  );
}
