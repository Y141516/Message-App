import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Messenger App',
  description: 'Jay Bhagwanji',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" />
        <meta name="theme-color" content="#0A0A0F" />
      </head>
      <body className="bg-[#0A0A0F] min-h-screen">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1A1A26',
              color: '#F0EDE8',
              border: '1px solid #3A3A52',
              borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif',
            },
            success: {
              iconTheme: { primary: '#4CAF78', secondary: '#0A0A0F' },
            },
            error: {
              iconTheme: { primary: '#E05252', secondary: '#0A0A0F' },
            },
          }}
        />
      </body>
    </html>
  );
}
