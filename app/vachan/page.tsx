'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';

// All 60 Vachans — shown exactly as-is, no translation, no explanation
const VACHANS = [
  'ऩयारे और पयारे होकर रहो।',
  'Raise your spiritual power.',
  'जो भी हो रहा है through God हो रहा है।',
  'In all the situations of life keep yourself calm.',
  'मजबूर नही मजबूत बनो।',
  'Satisfy your soul not society.',
  'गुरु के राज में हमेशा राज करोगे।',
  'करमों की सुजागी रखो।',
  'कठीनाईयॉ से भागना नही जागना है।',
  'निष़काम ही सबसे बड़ा सुख है।',
  'See God in everything.',
  'Never be afraid to trust an unknown future to known god.',
  'गुरु में १००% नही २००% विशवास रखो।',
  'Bhagwanji is everywhere.',
  'विशवासी मनुष्य हारा हुआ खेल भी जीत सकता है।',
  'भगवान जी आपकी इच्छा पूरी होय मेरी नहीं।',
  'अपनी तार हमेशा गुरु से जोड़ कर रखो।',
  'Silence is luxurious.',
  'कृपाये याद रखोगे तो हमेशा कृपाये बरसेंगी।',
  'विशालता की दृष्टि बनाओ।',
  'As you think so you become.',
  'God has plan for you trust it, live it, enjoy it.',
  'शुकराना और मुस़कुराना।',
  'सुख को मालिक की कृपा समझो।',
  'As the company so the colour.',
  'You\'ll always be the sun for those who know your worth.',
  'आज से भविष्य के लिए कोई चिंता ना करेंगे।',
  'Sometimes failure is the first step of success.',
  'गुरु पर पुरा विशवास होता है तो miracles भी होते हैं।',
  'Be yourself everyone else is already taken.',
  'गुरु को हर हालत में पकड़कर रखो।',
  'Love is god god is love.',
  'Your nature is your future.',
  'धीरज के बिना मनुष्य का सारा जीवन hurry और worry में बरबाद हो जाता है।',
  'गुरु की रजा में राजी रहो।',
  'विशवास ही सबसे बड़ी ताकत है।',
  'विशवास ही करामातो की करामात है।',
  'धीरज महाधीरज सदा धीरज।',
  'अपने दिल में thanks और पयार को entry दो।',
  'सुख ही सुख है सुख देने में दुख ही दुख है सुख लेने में।',
  'जहाँ चाह वहाँ राह।',
  'वाह साई वाह।',
  'जब आपके मन में भक्ति है तो गुरु शकित्त्या भर भर कर देते हैं।',
  'सबको समानता का पयार करो।',
  'जिसके सिर उपर तू साई, सो दुख कैसा पावे।',
  'निरईचछा होकर चलोगे तो बादशाही मिलेगी।',
  'मान न मान, तू है भगवान।',
  'हर समय को सलाम है।',
  'सकारात्मक सोच।',
  'गुणों का गुलदस्ता बनाओ।',
  'नेकी कर कुवे में डाल।',
  'मन जीते जग जीत।',
  'हर बात में राज है, भलाई है।',
  'हर शन भगवान का नाम जपे।',
  'सबको पयार की दृष्टि से देखो।',
  'एक एक पल भगवान की अमानत है।',
  'जग सुधारक नहीं आप सुधारक बने।',
];

export default function VachanPage() {
  const { t } = useTheme();
  const [current, setCurrent] = useState('');
  const [key, setKey] = useState(0);

  const getRandomVachan = () => {
    const idx = Math.floor(Math.random() * VACHANS.length);
    setCurrent(VACHANS[idx]);
    setKey(k => k + 1);
  };

  useEffect(() => { getRandomVachan(); }, []);

  // Detect if text is primarily Hindi (contains Devanagari)
  const isHindi = /[\u0900-\u097F]/.test(current);

  return (
    <AppShell>
      <PageHeader title={t('vachan.title')} helpKey="vachan" />

      <div className="px-4 pb-6 max-w-lg mx-auto flex flex-col gap-5">

        {/* Vachan Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={key}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative rounded-3xl overflow-hidden"
            style={{ border: '1px solid rgba(201,168,76,0.25)', background: 'var(--bg-card)' }}
          >
            {/* Background glow */}
            <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(201,168,76,0.06)' }} />
            <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(168,85,247,0.04)' }} />

            <div className="relative p-7">
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)' }}>
                <Sparkles className="w-5 h-5 text-gold" />
              </div>

              {/* Label */}
              <p className="text-xs uppercase tracking-widest mb-4 font-medium text-gold">{t('vachan.title')}</p>

              {/* Divider */}
              <div className="h-px mb-6" style={{ background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.4), transparent)' }} />

              {/* Vachan Text */}
              <p
                className="leading-relaxed font-medium"
                style={{
                  color: 'var(--text-primary)',
                  fontSize: isHindi ? '1.25rem' : '1.15rem',
                  fontFamily: isHindi ? 'sans-serif' : 'Cinzel, serif',
                  lineHeight: isHindi ? '2rem' : '1.8rem',
                }}
              >
                {current}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Refresh Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={getRandomVachan}
          className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm font-medium">{t('vachan.new')}</span>
        </motion.button>

        {/* Count indicator */}
        <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          {VACHANS.length} Vachans
        </p>

      </div>
    </AppShell>
  );
}
