import type { ReactNode } from 'react';
import { MotionProvider } from '@/components/motion-provider';

export default function DevLayout({ children }: { children: ReactNode }) {
  return <MotionProvider>{children}</MotionProvider>;
}
