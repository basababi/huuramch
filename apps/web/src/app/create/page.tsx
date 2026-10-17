import type { Metadata } from 'next';
import { CreateScreen } from '@/components/screens/create-screen';
import { mn } from '@/i18n/mn';

export const metadata: Metadata = { title: mn.create.title };

export default function CreatePage() {
  return <CreateScreen />;
}
