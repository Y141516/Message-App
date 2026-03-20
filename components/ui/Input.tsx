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
        <label className="text-sm font-medium text-[#9A9AB0]">{label}</label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5A5A72]">
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
            'w-full bg-[#12121A] border rounded-xl px-4 py-3 text-[#F0EDE8] text-sm',
            'placeholder:text-[#5A5A72] outline-none transition-all duration-200',
            'focus:border-[#C9A84C]/60 focus:bg-[#1A1A26] focus:shadow-[0_0_0_3px_rgba(201,168,76,0.1)]',
            icon && 'pl-10',
            error ? 'border-red-500/50' : 'border-[#2A2A3E]',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      {hint && !error && <p className="text-[#5A5A72] text-xs">{hint}</p>}
    </div>
  );
}
