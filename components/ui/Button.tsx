'use client';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'gold' | 'ghost' | 'danger' | 'emergency' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
}

export default function Button({
  children, onClick, variant = 'gold', size = 'md',
  disabled, loading, className, fullWidth, type = 'button',
}: ButtonProps) {
  const base = 'relative inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-200 select-none overflow-hidden';
  
  const variants = {
    gold: 'bg-gradient-to-r from-[#C9A84C] via-[#E8C97A] to-[#C9A84C] text-[#0A0A0F] shadow-[0_0_20px_rgba(201,168,76,0.3)] hover:shadow-[0_0_30px_rgba(201,168,76,0.5)] active:scale-95',
    ghost: 'bg-[#1A1A26] border border-[#3A3A52] text-[#F0EDE8] hover:bg-[#22223A] hover:border-[#C9A84C]/40 active:scale-95',
    danger: 'bg-[#E05252]/20 border border-[#E05252]/40 text-[#E05252] hover:bg-[#E05252]/30 active:scale-95',
    emergency: 'bg-[#E05252] text-white shadow-[0_0_20px_rgba(224,82,82,0.3)] hover:shadow-[0_0_30px_rgba(224,82,82,0.5)] active:scale-95',
    secondary: 'bg-[#22223A] text-[#9A9AB0] hover:text-[#F0EDE8] hover:bg-[#2A2A3E] active:scale-95',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm h-9',
    md: 'px-5 py-2.5 text-sm h-11',
    lg: 'px-6 py-3 text-base h-13',
  };

  return (
    <motion.button
      type={type}
      whileTap={{ scale: disabled ? 1 : 0.96 }}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        base,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </span>
      )}
      <span className={loading ? 'opacity-0' : ''}>{children}</span>
    </motion.button>
  );
}
