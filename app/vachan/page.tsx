'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, BookOpen, Globe } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useUserStore } from '@/store/userStore';
import { Vachan } from '@/types';
import { cn } from '@/lib/utils';

export default function VachanPage() {
  const { language, setLanguage } = useUserStore();
  const [vachan, setVachan] = useState<Vachan | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => { fetchVachan(); }, []);

  const fetchVachan = async () => {
    setSpinning(true);
    try {
      const res = await fetch('/api/vachan');
      const data = await res.json();
      setVachan(data.vachan);
    } catch {
      // use fallback
      setVachan({
        id: '1',
        vachan_text: 'સત્ય જ ઈશ્વર છે',
        explanation_en: 'Truth is God. By living truthfully in every moment, we connect with the divine presence within and around us.',
        explanation_hi: 'सत्य ही ईश्वर है। हर पल सत्यता से जीने से हम अपने भीतर और आसपास की दिव्य उपस्थिति से जुड़ते हैं।',
      });
    } finally {
      setLoading(false);
      setTimeout(() => setSpinning(false), 600);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Vachan" subtitle="Daily Inspiration" showHelp />

      <div className="px-4 pb-6 max-w-lg mx-auto">

        {/* Language Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-end mb-4"
        >
          <div className="flex items-center gap-1 bg-[#12121A] rounded-xl p-1 border border-[#2A2A3E]">
            <Globe className="w-3.5 h-3.5 text-[#5A5A72] ml-1.5" />
            {(['en', 'hi'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-all ml-1',
                  language === lang
                    ? 'bg-[#C9A84C] text-[#0A0A0F]'
                    : 'text-[#5A5A72] hover:text-[#9A9AB0]'
                )}
              >
                {lang === 'en' ? 'English' : 'हिंदी'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Vachan Card */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-[#1A1A26] border border-[#2A2A3E] rounded-3xl p-8 min-h-[320px] flex items-center justify-center"
            >
              <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key={vachan?.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative overflow-hidden"
            >
              {/* Background decoration */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#C9A84C]/5 via-transparent to-purple-500/5 pointer-events-none" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#C9A84C]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative bg-[#1A1A26] border border-[#C9A84C]/20 rounded-3xl p-7">
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mb-6">
                  <BookOpen className="w-5 h-5 text-[#C9A84C]" />
                </div>

                {/* Vachan Text */}
                <p className="text-[#C9A84C] text-xs uppercase tracking-widest mb-3 font-medium">Vachan</p>
                <h2
                  className="text-2xl font-bold text-[#F0EDE8] mb-6 leading-relaxed"
                  style={{ fontFamily: 'Cinzel, serif' }}
                >
                  {vachan?.vachan_text}
                </h2>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C]/30 to-transparent mb-6" />

                {/* Explanation */}
                <div>
                  <p className="text-[#5A5A72] text-xs uppercase tracking-wider mb-2">Explanation</p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={language}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.25 }}
                      className="text-[#9A9AB0] text-sm leading-relaxed"
                      style={language === 'hi' ? { fontFamily: 'sans-serif' } : {}}
                    >
                      {language === 'en' ? vachan?.explanation_en : vachan?.explanation_hi}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Refresh Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-5"
        >
          <button
            onClick={fetchVachan}
            disabled={spinning}
            className="w-full py-3.5 rounded-2xl bg-[#1A1A26] border border-[#2A2A3E] flex items-center justify-center gap-2 text-[#9A9AB0] hover:text-[#C9A84C] hover:border-[#C9A84C]/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', spinning && 'animate-spin')} />
            <span className="text-sm font-medium">New Vachan</span>
          </button>
        </motion.div>

      </div>
    </AppShell>
  );
}
