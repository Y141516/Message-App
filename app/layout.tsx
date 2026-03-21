import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/contexts/ThemeContext';

export const metadata: Metadata = {
  title: 'Messenger App',
  description: 'Jay Bhagwanji',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#0A0A0F" />
      </head>
      <body>
        {/* Telegram WebApp SDK — must load before anything else */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        <ThemeProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                fontFamily: 'DM Sans, sans-serif',
              },
              success: { iconTheme: { primary: '#4CAF78', secondary: '#0A0A0F' } },
              error:   { iconTheme: { primary: '#E05252', secondary: '#0A0A0F' } },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
