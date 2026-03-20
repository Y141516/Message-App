'use client';
import { useRouter } from 'next/navigation';
import { ChevronLeft, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showHelp?: boolean;
  onHelp?: () => void;
  className?: string;
}

export default function PageHeader({
  title, subtitle, showBack, showHelp, onHelp, className,
}: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className={cn('flex items-center gap-3 px-4 pt-4 pb-2', className)}>
      {showBack && (
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl bg-[#1A1A26] border border-[#2A2A3E] flex items-center justify-center text-[#9A9AB0] hover:text-[#F0EDE8] hover:border-[#3A3A52] transition-all flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-semibold text-[#F0EDE8] truncate">{title}</h1>
        {subtitle && <p className="text-xs text-[#5A5A72] truncate">{subtitle}</p>}
      </div>
      {showHelp && (
        <button
          onClick={onHelp}
          className="w-9 h-9 rounded-xl bg-[#1A1A26] border border-[#2A2A3E] flex items-center justify-center text-[#5A5A72] hover:text-[#C9A84C] hover:border-[#C9A84C]/30 transition-all flex-shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
