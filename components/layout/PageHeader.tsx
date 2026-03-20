'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <div className={cn('flex items-center gap-3 px-4 pt-4 pb-2', className)}>
        {showBack && (
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{title}</h1>
          {subtitle && <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
        {helpKey && (
          <button
            onClick={() => setHelpOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}
      </div>

      {helpKey && (
        <HelpPopup
          isOpen={helpOpen}
          onClose={() => setHelpOpen(false)}
          title={HELP_CONTENT[helpKey].title}
          steps={HELP_CONTENT[helpKey].steps}
        />
      )}
    </>
  );
}
