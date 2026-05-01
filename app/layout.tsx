import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Nyenrode Examenplanning',
  description: 'Planningssysteem voor tentamens aan Nyenrode Business University',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
