import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PlayerApp } from '@/components/screens/player-app';
import { mn } from '@/i18n/mn';

const ROOM_CODE = /^\d{4}$/;

export async function generateMetadata({ params }: PageProps<'/room/[code]'>): Promise<Metadata> {
  const { code } = await params;
  return { title: `${mn.room.label} ${code}`, robots: { index: false, follow: false } };
}

/** A player's phone in room `code` (§5.3–5.10). Everything after the first paint is live state. */
export default async function RoomPage({ params }: PageProps<'/room/[code]'>) {
  const { code } = await params;
  if (!ROOM_CODE.test(code)) notFound();
  return <PlayerApp code={code} />;
}
