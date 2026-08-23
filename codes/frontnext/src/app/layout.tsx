import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';

import { AuthProvider } from '@/components/AuthProvider';
import { firebaseConfigFromEnv } from '@/lib/firebase-config';
import { currentLocale } from '@/lib/locale';

import './globals.css';

// Loaded through next/font so the files are self hosted. Nothing is fetched
// from a third party at runtime, which keeps the manuscript on screen and the
// person reading it out of anyone else's logs.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CITRA Viva',
  description:
    'A thesis defense simulator that reads your research draft and tests the weakest points of your argument.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await currentLocale();
  // Read on the server and handed down, because Cloud Run supplies environment
  // variables at runtime and NEXT_PUBLIC_ values are frozen at build time.
  const firebase = firebaseConfigFromEnv();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${sourceSerif.variable} ${jetbrains.variable}`}
    >
      <body>
        <AuthProvider config={firebase}>{children}</AuthProvider>
      </body>
    </html>
  );
}
