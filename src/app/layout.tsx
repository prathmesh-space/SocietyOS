import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen custom-scrollbar">{children}</body>
    </html>
  );
}
