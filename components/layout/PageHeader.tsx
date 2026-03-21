'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import HelpPopup, { HELP_CONTENT } from '@/components/ui/HelpPopup';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  helpKey?: keyof typeof HELP_CONTENT;
  className?: string;
}

export default function PageHeader({ title, subtitle, showBack, helpKey, className }: PageHeaderProps) {
  const router = useRouter();
  const { isLight } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <div className={cn('flex items-center gap-3 px-4 pt-5 pb-3', className)}>
        {showBack && (
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          {title && (
            <h1 className={cn('text-2xl font-bold truncate', isLight && 'page-title')}
              style={{ color: isLight ? '#3D3D8F' : 'var(--text-primary)' }}>
              {title}
            </h1>
          )}
          {subtitle && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        {helpKey && (
          <button onClick={() => setHelpOpen(true)}
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: isLight ? '#EEEEF7' : 'var(--bg-elevated)',
              border: `1px solid ${isLight ? '#D0CFED' : 'var(--border-subtle)'}`,
              color: isLight ? '#7B5EA7' : 'var(--text-muted)',
            }}>
            <HelpCircle className="w-5 h-5" />
          </button>
        )}
      </div>
      {helpKey && (
        <HelpPopup isOpen={helpOpen} onClose={() => setHelpOpen(false)}
          title={HELP_CONTENT[helpKey].title} steps={HELP_CONTENT[helpKey].steps} />
      )}
    </>
  );
}
