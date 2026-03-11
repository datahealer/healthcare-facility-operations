import type { Metadata } from 'next';

import { DevToolLayout } from '@/components/app-layout';
import { RootProviders } from '@/components/root-providers';
import { getMessages } from 'next-intl/server';

import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Makerkit | Dev Tool',
  description: 'The dev tool for Makerkit',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    <html lang="en">
      <body>
        <RootProviders messages={messages}>
          <DevToolLayout>{children}</DevToolLayout>
        </RootProviders>
      </body>
    </html>
  );
}
