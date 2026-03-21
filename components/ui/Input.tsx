'use client';
import { cn } from '@/lib/utils';
import { ChangeEvent, ReactNode } from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  icon?: ReactNode;
  error?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
}

export default function Input({
  label, placeholder, value, onChange, type = 'text',
  icon, error, hint, className, disabled, maxLength,
}: InputProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-[var(--text-secondary)]">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            'w-full bg-[var(--bg-secondary)] border rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm',
            'placeholder:text-[var(--text-muted)] outline-none transition-all duration-200',
            'focus:border-[#C9A84C]/60 focus:bg-[var(--bg-card)] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.1)]',
            icon && 'pl-10',
            error ? 'border-red-500/50' : 'border-[var(--border-subtle)]',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {hint && !error && <p className="text-[var(--text-muted)] text-xs">{hint}</p>}
    </div>
  );
}
