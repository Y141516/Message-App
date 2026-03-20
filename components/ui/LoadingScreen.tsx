'use client';
import { motion } from 'framer-motion';

export default function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center gap-6">
      {/* Logo mark */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-20 h-20"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#C9A84C] to-[#8A6F2E] opacity-20 blur-xl animate-pulse" />
        <div className="relative w-20 h-20 rounded-2xl bg-[#1A1A26] border border-[#C9A84C]/30 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center"
      >
        <p className="text-[#9A9AB0] text-sm">{message}</p>
      </motion.div>
    </div>
  );
}
