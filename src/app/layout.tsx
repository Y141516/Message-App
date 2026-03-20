import type { Metadata } from 'next';
import { Outfit, DM_Sans } from 'next/font/google';
import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Messenger App',
  description: 'Jay Bhagwanji - Messenger App',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Apply saved theme on first load to prevent flash
              try {
                const theme = localStorage.getItem('theme') || 'dark';
                document.documentElement.className = theme === 'light' ? 'light' : 'dark';
                if (theme === 'light') document.body.classList.add('light-theme');
              } catch(e) {}
            `,
          }}
        />
        {/* Telegram WebApp SDK */}
        <script src="https://telegram.org/js/telegram-web-app.js" />
      </head>
      <body className={`${outfit.variable} ${dmSans.variable}`}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1A1A26',
              color: '#F0F0FF',
              border: '1px solid #2A2A3E',
              borderRadius: '12px',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
            },
            success: {
              iconTheme: { primary: '#2ED573', secondary: '#1A1A26' },
            },
            error: {
              iconTheme: { primary: '#FF4757', secondary: '#1A1A26' },
            },
          }}
        />
      </body>
    </html>
  );
}
