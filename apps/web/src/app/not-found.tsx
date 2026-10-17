import { ButtonLink } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { arrowLeft } from '@/components/ui/icon-data';
import { mn } from '@/i18n/mn';

/** Mongolian 404 (§5: all copy in Mongolian) — wrong link or a typo in a room address. */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col justify-center gap-5 px-4 py-8">
      <p aria-hidden className="font-display tabular text-[5rem] leading-none font-black">
        404
      </p>
      <h1 className="font-display text-[2rem] leading-tight font-extrabold">{mn.notFound.title}</h1>
      <p className="text-lg font-medium text-fg-muted">{mn.notFound.body}</p>
      <ButtonLink href="/" block iconStart={<Icon icon={arrowLeft} />} className="mt-4">
        {mn.room.home}
      </ButtonLink>
    </main>
  );
}
