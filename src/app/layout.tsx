import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grünkarte Karlsruhe',
  description: 'Karte der Grünanlagen, Bäume und kühlen Orte in Karlsruhe',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
