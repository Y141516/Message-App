import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'gold' | 'green' | 'red' | 'blue' | 'purple' | 'muted';
  className?: string;
}

export default function Badge({ children, variant = 'gold', className }: BadgeProps) {
  const variants = {
    gold: 'bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30',
    green: 'bg-green-500/15 text-green-400 border border-green-500/30',
    red: 'bg-red-500/15 text-red-400 border border-red-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    muted: 'bg-[#2A2A3E] text-[#9A9AB0] border border-[#3A3A52]',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
