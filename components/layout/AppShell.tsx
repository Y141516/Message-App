'use client';
import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function AppShell({ children, showNav = true }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <main className={showNav ? 'flex-1 pb-24' : 'flex-1'}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
