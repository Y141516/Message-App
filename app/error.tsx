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

  return (
    <html>
      <body style={{ background: '#0A0A0F', color: '#F0EDE8', fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>Something went wrong</h2>
        <p style={{ color: '#9A9AB0', fontSize: '13px', marginBottom: '24px' }}>
          {error.message || 'An unexpected error occurred'}
        </p>
        <button onClick={reset}
          style={{ background: '#C9A84C', color: '#0A0A0F', border: 'none', borderRadius: '12px', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer' }}>
          Try Again
        </button>
      </body>
    </html>
  );
}
