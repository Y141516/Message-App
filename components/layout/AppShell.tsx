'use client';
import { ReactNode } from 'react';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export default function AppShell({ children, showNav = true }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
      <main className={showNav ? 'flex-1 pb-24' : 'flex-1'}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
