import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'FlowForge', template: '%s | FlowForge' },
  description: 'Industry-grade SaaS automation builder. Connect your apps, automate your workflows.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
          :root { --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          body { font-family: var(--font-sans); }
        `}</style>
      </head>
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster richColors position="top-right" expand closeButton />
        </Providers>
      </body>
    </html>
  );
}
