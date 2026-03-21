'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Sparkles } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader from '@/components/layout/PageHeader';
import { useTheme } from '@/contexts/ThemeContext';

const VACHANS = [
  'ऩयारे और पयारे होकर रहो।','Raise your spiritual power.',
  'जो भी हो रहा है through God हो रहा है।','In all the situations of life keep yourself calm.',
  'मजबूर नही मजबूत बनो।','Satisfy your soul not society.',
  'गुरु के राज में हमेशा राज करोगे।','करमों की सुजागी रखो।',
  'कठीनाईयॉ से भागना नही जागना है।','निष़काम ही सबसे बड़ा सुख है।',
  'See God in everything.','Never be afraid to trust an unknown future to known god.',
  'गुरु में १००% नही २००% विशवास रखो।','Bhagwanji is everywhere.',
  'विशवासी मनुष्य हारा हुआ खेल भी जीत सकता है।','भगवान जी आपकी इच्छा पूरी होय मेरी नहीं।',
  'अपनी तार हमेशा गुरु से जोड़ कर रखो।','Silence is luxurious.',
  'कृपाये याद रखोगे तो हमेशा कृपाये बरसेंगी।','विशालता की दृष्टि बनाओ।',
  'As you think so you become.','God has plan for you trust it, live it, enjoy it.',
  'शुकराना और मुस़कुराना।','सुख को मालिक की कृपा समझो।',
  'As the company so the colour.','You\'ll always be the sun for those who know your worth.',
  'आज से भविष्य के लिए कोई चिंता ना करेंगे।','Sometimes failure is the first step of success.',
  'गुरु पर पुरा विशवास होता है तो miracles भी होते हैं।','Be yourself everyone else is already taken.',
  'गुरु को हर हालत में पकड़कर रखो।','Love is god god is love.',
  'Your nature is your future.','धीरज के बिना मनुष्य का सारा जीवन hurry और worry में बरबाद हो जाता है।',
  'गुरु की रजा में राजी रहो।','विशवास ही सबसे बड़ी ताकत है।',
  'विशवास ही करामातो की करामात है।','धीरज महाधीरज सदा धीरज।',
  'अपने दिल में thanks और पयार को entry दो।','सुख ही सुख है सुख देने में दुख ही दुख है सुख लेने में।',
  'जहाँ चाह वहाँ राह।','वाह साई वाह।',
  'जब आपके मन में भक्ति है तो गुरु शकित्त्या भर भर कर देते हैं।','सबको समानता का पयार करो।',
  'जिसके सिर उपर तू साई, सो दुख कैसा पावे।','निरईचछा होकर चलोगे तो बादशाही मिलेगी।',
  'मान न मान, तू है भगवान।','हर समय को सलाम है।',
  'सकारात्मक सोच।','गुणों का गुलदस्ता बनाओ।',
  'नेकी कर कुवे में डाल।','मन जीते जग जीत।',
  'हर बात में राज है, भलाई है।','हर शन भगवान का नाम जपे।',
  'सबको पयार की दृष्टि से देखो।','एक एक पल भगवान की अमानत है।',
  'जग सुधारक नहीं आप सुधारक बने।',
];

export default function VachanPage() {
  const { t, isLight } = useTheme();
  const [current, setCurrent] = useState('');
  const [key, setKey] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const getRandom = () => {
    const idx = Math.floor(Math.random() * VACHANS.length);
    setCurrent(VACHANS[idx]);
    setKey(k => k + 1);
    setSpinning(true);
    setTimeout(() => setSpinning(false), 600);
  };

  useEffect(() => { getRandom(); }, []);

  const isHindi = /[\u0900-\u097F]/.test(current);

  return (
    <AppShell>
      <PageHeader title={t('vachan.title')} helpKey="vachan" />

      <div className="px-4 pb-6 max-w-lg mx-auto flex flex-col gap-4">
        <AnimatePresence mode="wait">
          <motion.div key={key}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl overflow-hidden"
            style={{ background: 'var(--vachan-card-bg)', border: '1px solid var(--vachan-card-border)', boxShadow: isLight ? '0 4px 20px rgba(168,85,247,0.1)' : 'none' }}>

            <div className="p-8 flex flex-col items-center text-center">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: 'var(--vachan-icon-bg)' }}>
                <Sparkles className="w-7 h-7 text-white" />
              </div>

              {/* Label */}
              <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--accent)' }}>
                {t('vachan.title')}
              </p>

              {/* Vachan text */}
              <p style={{
                color: 'var(--text-primary)',
                fontSize: isHindi ? '1.25rem' : '1.2rem',
                fontFamily: isHindi ? 'sans-serif' : 'Georgia, serif',
                fontStyle: isHindi ? 'normal' : 'italic',
                lineHeight: '1.8',
                fontWeight: 500,
              }}>
                {isHindi ? current : `"${current}"`}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* New Vachan button — purple gradient like Figma */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={getRandom}
          className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-white font-semibold text-base"
          style={{ background: 'var(--vachan-btn-bg)', boxShadow: isLight ? '0 4px 20px rgba(155,93,229,0.35)' : 'none' }}>
          <RefreshCw className={cn('w-5 h-5', spinning && 'animate-spin')} />
          {t('vachan.new')}
        </motion.button>

      </div>
    </AppShell>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
