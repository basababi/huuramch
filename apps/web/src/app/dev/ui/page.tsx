import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ANIMAL_IDS } from '@/components/game/animals';
import { Avatar } from '@/components/game/avatar';
import { ScoreBar } from '@/components/game/score-bar';
import { WaitingState } from '@/components/game/waiting-state';
import { WinnerBanner } from '@/components/game/winner-banner';
import { Wordmark } from '@/components/game/wordmark';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import {
  arrowRight,
  detective,
  maskHappy,
  medal,
  play,
  plus,
  replay,
  signIn,
  signOut,
  skip,
  speaker,
  x,
} from '@/components/ui/icon-data';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { AVATAR_COLORS, COLORS, type ColorToken } from '@/design/tokens';
import { mn } from '@/i18n/mn';
import { contrastRatio } from '@/lib/contrast';
import {
  FormDemo,
  LobbyDemo,
  RoleCardDemo,
  RoleFacesDemo,
  StampDemo,
  TimerDemo,
  VoteDemo,
  YourTurnDemo,
} from './demos';
import { samplePlayer } from './samples';

export const metadata: Metadata = {
  title: mn.dev.uiTitle,
  robots: { index: false, follow: false },
};

const SWATCHES: Array<{ token: ColorToken; text: string }> = [
  { token: 'ink', text: COLORS.paper },
  { token: 'paper', text: COLORS.ink },
  { token: 'tenger', text: COLORS.paper },
  { token: 'al', text: COLORS.paper },
  { token: 'alt', text: COLORS.ink },
  { token: 'nogoon', text: COLORS.ink },
  { token: 'tsenher', text: COLORS.ink },
  { token: 'night', text: COLORS.paper },
];

function Section({
  id,
  title,
  children,
  wide = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      data-section={id}
      className={wide ? 'flex flex-col gap-5 tv:col-span-2' : 'flex flex-col gap-5'}
    >
      <h2
        id={`${id}-title`}
        className="flex items-center gap-3 font-display text-[1.375rem] font-extrabold tv:text-[1.75rem]"
      >
        <span aria-hidden className="h-[var(--stroke)] w-6 bg-line" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function DevUiPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const frozen = params.freeze === '1';
  const scores = [7, 5, 4, 2].map((score, i) => ({ ...samplePlayer(i), score }));

  return (
    <main className="mx-auto flex w-full max-w-[30rem] flex-col gap-14 px-4 py-6 tv:max-w-[112rem] tv:px-12 tv:py-10">
      <header className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold tracking-[0.12em] text-fg-muted uppercase">/dev/ui</p>
            <h1 className="font-display text-[1.75rem] leading-tight font-extrabold tv:text-[2.5rem]">
              {mn.dev.uiTitle}
            </h1>
            <p className="text-base text-fg-muted">{mn.dev.uiIntro}</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-14 tv:grid-cols-2 tv:gap-x-16">
        <Section id="palette" title={mn.dev.sections.palette} wide>
          <ul className="grid grid-cols-2 gap-3 tv:grid-cols-8">
            {SWATCHES.map(({ token, text }) => (
              <li
                key={token}
                className="flex flex-col overflow-hidden rounded-card bg-raised lift-sm ink-border"
              >
                <div
                  className="flex h-20 items-end p-2.5 font-display text-lg font-extrabold"
                  style={{ backgroundColor: COLORS[token], color: text }}
                >
                  Аа Өө Үү
                </div>
                <div className="flex flex-col gap-0.5 border-t-[length:var(--stroke)] border-line p-2.5">
                  <span className="text-[0.9375rem] font-bold">--{token}</span>
                  <span className="font-mono text-xs text-fg-muted">{COLORS[token]}</span>
                  <span className="text-xs leading-snug text-fg-muted">
                    {mn.dev.paletteUse[token]}
                  </span>
                  <span className="tabular text-xs font-bold">
                    {mn.dev.contrast(contrastRatio(COLORS[token], text).toFixed(1))}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
              {mn.dev.seatColors}
            </h3>
            <ul className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((color, i) => (
                <li
                  key={color}
                  className="grid size-10 place-items-center rounded-pill tabular text-xs font-bold text-ink ink-border"
                  style={{ backgroundColor: color }}
                >
                  {i + 1}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="type" title={mn.dev.sections.type}>
          <Wordmark as="p" ornament={false} />
          <div className="flex flex-col gap-3">
            <p className="font-display text-[3.25rem] leading-none font-extrabold tv:text-[4.5rem]">
              {mn.dev.sampleWord}
            </p>
            <p className="font-display text-[2.25rem] leading-none font-black text-al tv:text-[2.75rem]">
              {mn.roleCard.imposter}
            </p>
            <p className="font-display tabular text-[2rem] leading-none font-bold">0123456789</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[1.375rem] leading-snug font-semibold">{mn.app.tagline}</p>
            {(['font-bold', 'font-semibold', 'font-medium', 'font-normal'] as const).map(
              (weight, i) => (
                <p key={weight} className={`text-lg ${weight}`}>
                  {mn.dev.shortLine} — Onest {700 - i * 100}
                </p>
              ),
            )}
            <p className="text-base text-fg-muted">{mn.app.description}</p>
          </div>
        </Section>

        <Section id="buttons" title={mn.dev.sections.buttons}>
          <div className="flex flex-col gap-4">
            <Button block iconStart={<Icon icon={plus} />}>
              {mn.home.create}
            </Button>
            <Button block tone="secondary" iconStart={<Icon icon={signIn} />}>
              {mn.home.join}
            </Button>
            <Button block tone="highlight" iconEnd={<Icon icon={arrowRight} />}>
              {mn.home.enter}
            </Button>
            <Button block tone="success" iconStart={<Icon icon={play} />}>
              {mn.lobby.start}
            </Button>
            <Button block tone="danger">
              {mn.voting.cast}
            </Button>
            <Button block tone="ink">
              {mn.turn.done}
            </Button>
            <div className="flex flex-wrap gap-4">
              <Button size="md" tone="secondary" data-pressed="true">
                {mn.dev.pressed}
              </Button>
              <Button size="md" disabled>
                {mn.dev.disabled}
              </Button>
              <Button size="md" tone="secondary" busy>
                {mn.dev.busy}
              </Button>
              <Button size="md" tone="secondary" iconStart={<Icon icon={signOut} />}>
                {mn.result.leave}
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <IconButton icon={replay} label={mn.result.replay} />
              <IconButton icon={skip} label={mn.discussion.toVoting} tone="highlight" />
              <IconButton icon={speaker} label={mn.common.sound} tone="primary" />
              <IconButton icon={x} label={mn.common.close} size="lg" />
            </div>
          </div>
        </Section>

        <Section id="forms" title={mn.dev.sections.forms}>
          <FormDemo />
        </Section>

        <Section id="avatars" title={mn.dev.sections.avatars} wide>
          <ul className="grid grid-cols-4 gap-x-2 gap-y-4 tv:grid-cols-12">
            {ANIMAL_IDS.map((id, i) => (
              <li key={id} className="flex flex-col items-center gap-1.5">
                <Avatar animal={id} color={AVATAR_COLORS[i] ?? COLORS.tenger} size={72} idle />
                <span className="text-sm font-bold">{mn.animals[id]}</span>
              </li>
            ))}
          </ul>
          <h3 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
            {mn.dev.eliminatedRow}
          </h3>
          <ul className="grid grid-cols-6 gap-2 tv:grid-cols-12">
            {ANIMAL_IDS.map((id, i) => (
              <li key={id} className="flex justify-center">
                <Avatar
                  animal={id}
                  color={AVATAR_COLORS[i] ?? COLORS.tenger}
                  size={48}
                  eliminated
                />
              </li>
            ))}
          </ul>
          <h3 className="text-sm font-bold tracking-[0.1em] text-fg-muted uppercase">
            {mn.dev.sizes}
          </h3>
          <div className="flex flex-wrap items-end gap-4">
            {[32, 40, 56, 72, 96, 128].map((size) => (
              <Avatar key={size} animal="temee" color={COLORS.tenger} size={size} />
            ))}
          </div>
        </Section>

        <Section id="lobby" title={mn.dev.sections.lobby}>
          <LobbyDemo />
          <WaitingState
            animal="tarvaga"
            color={AVATAR_COLORS[8] ?? COLORS.tsenher}
            title={mn.lobby.waitingForHost}
            detail={mn.lobby.hostWillStart('Бат')}
          />
        </Section>

        <Section id="voting" title={mn.dev.sections.voting}>
          <VoteDemo />
        </Section>

        <Section id="role-card" title={mn.dev.sections.roleCard}>
          <RoleCardDemo />
        </Section>

        <Section id="turn" title={mn.dev.sections.turn}>
          <div className="flex justify-center">
            <YourTurnDemo frozen={frozen} />
          </div>
        </Section>

        <Section id="role-faces" title={mn.dev.sections.roleFaces} wide>
          <RoleFacesDemo />
        </Section>

        <Section id="timer" title={mn.dev.sections.timer}>
          <TimerDemo frozen={frozen} />
        </Section>

        <Section id="stamp" title={mn.dev.sections.stamp}>
          <StampDemo frozen={frozen} />
        </Section>

        <Section id="results" title={mn.dev.sections.results} wide>
          <div className="grid gap-6 tv:grid-cols-2">
            <WinnerBanner winner="civilians" />
            <WinnerBanner winner="imposters" />
          </div>
          <div className="grid gap-8 tv:grid-cols-2">
            <ol className="flex flex-col gap-4">
              {scores.map((p, i) => (
                <ScoreBar
                  key={p.id}
                  name={p.name}
                  animal={p.animal}
                  color={p.color}
                  score={p.score}
                  max={7}
                  order={i}
                />
              ))}
            </ol>
            <ul className="flex flex-col gap-3">
              {[
                { icon: maskHappy, title: mn.result.titles.liar, who: 'Сараа' },
                { icon: detective, title: mn.result.titles.detective, who: 'Тэмүүлэн' },
                { icon: medal, title: mn.result.titles.victim, who: 'Бат' },
              ].map((t) => (
                <li
                  key={t.title}
                  className="flex items-center gap-3 rounded-card bg-raised p-3 lift-sm ink-border"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-alt text-ink ink-border">
                    <Icon icon={t.icon} size={24} />
                  </span>
                  <span className="flex flex-col">
                    <span className="font-display text-base font-extrabold">{t.title}</span>
                    <span className="text-sm font-semibold text-fg-muted">{t.who}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-wrap gap-4">
            <Button tone="primary" iconStart={<Icon icon={replay} />}>
              {mn.result.replay}
            </Button>
            <Button tone="secondary" iconStart={<Icon icon={signOut} />}>
              {mn.result.leave}
            </Button>
          </div>
        </Section>

        <Section id="states" title={mn.dev.sections.states}>
          <div className="flex flex-col gap-4">
            <Banner tone="reconnecting" busy>
              {mn.connection.lost}
            </Banner>
            <Banner tone="success">{mn.connection.back}</Banner>
            <Banner tone="error">{mn.connection.roomNotFound}</Banner>
          </div>
          <p className="self-start rounded-card bg-raised px-4 py-3 text-base font-bold lift-sm ink-border">
            {mn.guess.waiting}
          </p>
        </Section>

        <Section id="ornament" title={mn.dev.sections.ornament}>
          <div className="flex flex-col gap-4">
            <span aria-hidden className="block h-4 ornament text-alt" />
            <span aria-hidden className="block h-6 ornament text-tenger" />
            <span aria-hidden className="block h-8 ornament text-fg" />
          </div>
        </Section>
      </div>
    </main>
  );
}
