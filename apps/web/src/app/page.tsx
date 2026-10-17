import Link from 'next/link';
import { Wordmark } from '@/components/game/wordmark';
import { HomeActions } from '@/components/home/home-actions';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { mn } from '@/i18n/mn';

/**
 * Home (§5.1): huge wordmark, one tagline, two actions in thumb reach, a small rules link.
 * Nothing else — no marketing sections, no feature grid, no footer.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] tv:max-w-[40rem]">
      <header className="flex justify-end">
        <ThemeToggle />
      </header>
      <section className="flex flex-1 flex-col justify-center gap-6 py-8">
        <Wordmark />
        <p className="max-w-[17rem] text-[1.375rem] leading-snug font-semibold">{mn.app.tagline}</p>
      </section>
      <HomeActions />
      <nav className="mt-5 flex justify-center">
        <Link
          href="/rules"
          prefetch={false}
          className="inline-flex min-h-12 items-center link-focus px-4 text-base font-bold underline decoration-[3px] underline-offset-[6px]"
        >
          {mn.home.rules}
        </Link>
      </nav>
    </main>
  );
}
