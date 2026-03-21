'use client';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Error:', error);
  }, [error]);

  const isEnvError = error.message?.toLowerCase().includes('supabase') ||
                     error.message?.toLowerCase().includes('key') ||
                     error.message?.toLowerCase().includes('url');

  return (
    <html>
      <body style={{ background: '#0A0A0F', color: '#F0EDE8', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>{isEnvError ? '🔑' : '⚠️'}</div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
          {isEnvError ? 'Configuration Error' : 'Something went wrong'}
        </h2>
        <p style={{ color: '#9A9AB0', fontSize: '13px', marginBottom: '16px', maxWidth: '280px', lineHeight: '1.6' }}>
          {isEnvError
            ? 'App is missing required environment variables. Please check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel.'
            : error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button onClick={reset}
          style={{ background: '#C9A84C', color: '#0A0A0F', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
          Try Again
        </button>
      </body>
    </html>
  );
}
