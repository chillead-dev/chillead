// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'chillead>.<',
  description: 'personal website',
  icons: {
    icon: '/favicon.webp',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* базовая защита */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
      </head>
      <body>{children}</body>
    </html>
  );
}
