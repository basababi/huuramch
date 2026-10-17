import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { ClientBoot } from '@/components/client-boot';
import { AvatarDefs } from '@/components/game/avatar';
import { mn } from '@/i18n/mn';
import { themeBootScript } from '@/lib/theme';
import { fontBody, fontDisplay } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: { default: mn.app.name, template: `%s · ${mn.app.name}` },
  description: mn.app.description,
  applicationName: mn.app.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#17171a',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="mn"
      data-theme="dark"
      className={`${fontDisplay.variable} ${fontBody.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets data-theme before first paint: no light flash in a dark room. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <AvatarDefs />
        <ClientBoot />
        {children}
      </body>
    </html>
  );
}
