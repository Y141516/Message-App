'use client';
import { motion } from 'framer-motion';
import { ShieldX } from 'lucide-react';

export default function NotAuthorizedPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6"
      >
        <ShieldX className="w-8 h-8 text-red-400" />
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold text-[#F0EDE8] mb-3"
      >
        Access Denied
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-[#9A9AB0] text-sm max-w-xs leading-relaxed"
      >
        You must be a member of at least one valid Telegram group to access this app. Please contact your administrator.
      </motion.p>
    </div>
  );
}
