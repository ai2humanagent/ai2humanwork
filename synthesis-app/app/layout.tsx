import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';
import LanguageProvider from '@/components/LanguageProvider';
import './globals.css';

const bodyFont = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600', '700'] });
const displayFont = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', weight: ['500', '700'] });
const monoFont = IBM_Plex_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500', '600'] });

export const metadata: Metadata = {
  title: 'ai2human — Human Fallback Infrastructure for Agents',
  description:
    'When an agent hits a real-world constraint, ai2human dispatches a human, collects proof, verifies completion, and settles payment.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable}`}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
