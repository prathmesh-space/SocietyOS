import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Playfair_Display, Source_Sans_3 } from 'next/font/google';

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source',
});

export const metadata: Metadata = {
  title: 'SocietyOS — Smart Housing Society Management',
  description:
    'Production-grade multi-tenant management platform for Indian residential housing societies. Manage billing, payments, complaints, visitor access, and notices for your entire building.',
  keywords: [
    'housing society',
    'society management',
    'maintenance billing',
    'visitor management',
    'co-operative housing',
    'Mumbai',
    'India',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${playfair.variable} ${sourceSans.variable} font-sans bg-alabaster text-forest min-h-screen custom-scrollbar`}>
        <div
          className="pointer-events-none fixed inset-0 z-50 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: "repeat",
          }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
