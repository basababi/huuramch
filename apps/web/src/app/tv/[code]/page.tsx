import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { TvApp } from '@/components/tv/tv-app';
import { mn } from '@/i18n/mn';

const ROOM_CODE = /^\d{4}$/;

export async function generateMetadata({ params }: PageProps<'/tv/[code]'>): Promise<Metadata> {
  const { code } = await params;
  return { title: `${mn.tv.title} ${code}`, robots: { index: false, follow: false } };
}

/** The shared big screen for room `code` (§5.12): read-only, never shows a secret. */
export default async function TvPage({ params }: PageProps<'/tv/[code]'>) {
  const { code } = await params;
  if (!ROOM_CODE.test(code)) notFound();
  return <TvApp code={code} />;
}
