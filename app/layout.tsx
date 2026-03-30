import type { Metadata, Viewport } from 'next';
import './globals.css';
import '../styles/globals.css';
import { StoreProvider } from '@/lib/store';

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'CorpFlow — Gestão Premium',
  description: 'Sistema profissional de gestão de funcionários, absenteísmo e horas extras.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CorpFlow',
  },
  icons: {
    icon: '/icons/icon-192.png',
    shortcut: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
