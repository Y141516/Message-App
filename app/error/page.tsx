'use client';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-6"
      >
        <AlertTriangle className="w-8 h-8 text-orange-400" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold text-[var(--text-primary)] mb-3"
      >
        Something went wrong
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-[var(--text-secondary)] text-sm max-w-xs leading-relaxed mb-8"
      >
        We couldn&apos;t connect to the server. Please try again.
      </motion.p>
      <Button onClick={() => window.location.href = '/'} variant="ghost">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  );
}
