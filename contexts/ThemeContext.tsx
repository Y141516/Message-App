'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';
type Lang = 'en' | 'hi';

interface ThemeContextValue {
  theme: Theme;
  lang: Lang;
  setTheme: (t: Theme) => void;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  isLight: boolean;
}

const translations: Record<string, Record<Lang, string>> = {
  'nav.home':        { en: 'Home',      hi: 'होम' },
  'nav.messages':    { en: 'Messages',  hi: 'संदेश' },
  'nav.vachan':      { en: 'Vachan',    hi: 'वचन' },
  'nav.profile':     { en: 'Profile',   hi: 'प्रोफाइल' },
  'nav.dashboard':   { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'home.greeting':   { en: 'Jay Bhagwanji', hi: 'जय भगवानजी' },
  'home.groups':     { en: 'YOUR GROUPS', hi: 'आपके ग्रुप' },
  'home.verified':   { en: 'Verified',  hi: 'सत्यापित' },
  'home.queue_open': { en: 'Queue is Open',   hi: 'कतार खुली है' },
  'home.queue_closed':{ en: 'Queue is Closed', hi: 'कतार बंद है' },
  'home.queue_open_sub':  { en: 'leader accepting messages', hi: 'नेता संदेश स्वीकार कर रहे हैं' },
  'home.queue_closed_sub':{ en: 'Messages not accepted right now', hi: 'अभी संदेश स्वीकार नहीं' },
  'home.send_message':    { en: 'Send Message', hi: 'संदेश भेजें' },
  'home.send_message_sub':{ en: 'Tap to compose a message', hi: 'संदेश लिखने के लिए टैप करें' },
  'home.queue_closed_btn':{ en: 'Queue is currently closed', hi: 'कतार अभी बंद है' },
  'home.emergency':   { en: 'EMERGENCY SERVICES', hi: 'आपातकालीन सेवाएं' },
  'home.always_active':{ en: 'Always Active', hi: 'हमेशा सक्रिय' },
  'home.medical':    { en: 'Medical',   hi: 'चिकित्सा' },
  'home.transport':  { en: 'Transport', hi: 'परिवहन' },
  'home.urgent':     { en: 'Urgent',    hi: 'अत्यावश्यक' },
  'home.emergency_limit': { en: 'Max 3 emergency messages per day', hi: 'प्रतिदिन अधिकतम 3 आपातकालीन संदेश' },
  'dashboard.title':   { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'dashboard.current': { en: 'Current',   hi: 'वर्तमान' },
  'dashboard.history': { en: 'Messages & Replies', hi: 'संदेश और उत्तर' },
  'dashboard.to':      { en: 'To',         hi: 'को' },
  'dashboard.awaiting':{ en: 'Awaiting reply from', hi: 'से उत्तर की प्रतीक्षा' },
  'dashboard.your_message':{ en: 'YOUR MESSAGE', hi: 'आपका संदेश' },
  'dashboard.reply':   { en: 'REPLY',      hi: 'उत्तर' },
  'dashboard.download_pdf':  { en: 'Download as PDF',   hi: 'PDF में डाउनलोड करें' },
  'dashboard.download_audio':{ en: 'Download Audio',    hi: 'ऑडियो डाउनलोड करें' },
  'dashboard.no_pending':    { en: 'No pending messages', hi: 'कोई लंबित संदेश नहीं' },
  'dashboard.no_replies':    { en: 'No replied messages', hi: 'कोई उत्तरित संदेश नहीं' },
  'dashboard.send_first':    { en: 'Send a Message', hi: 'संदेश भेजें' },
  'dashboard.filters':       { en: 'Filters', hi: 'फ़िल्टर' },
  'send.title':         { en: 'Send Message', hi: 'संदेश भेजें' },
  'send.send_to':       { en: 'Send To',      hi: 'को भेजें' },
  'send.message':       { en: 'Message',      hi: 'संदेश' },
  'send.placeholder':   { en: 'Write your message here...', hi: 'यहाँ अपना संदेश लिखें...' },
  'send.send_btn':      { en: 'Send Message', hi: 'संदेश भेजें' },
  'send.send_emergency':{ en: 'Send Emergency Message', hi: 'आपातकालीन संदेश भेजें' },
  'vachan.title':  { en: 'Vachan', hi: 'वचन' },
  'vachan.new':    { en: 'New Vachan', hi: 'नया वचन' },
  'profile.title':   { en: 'Profile',   hi: 'प्रोफाइल' },
  'profile.name':    { en: 'NAME',      hi: 'नाम' },
  'profile.telegram_id': { en: 'TELEGRAM ID', hi: 'टेलीग्राम ID' },
  'profile.phone':   { en: 'PHONE',     hi: 'फ़ोन' },
  'profile.city':    { en: 'CITY',      hi: 'शहर' },
  'profile.groups':  { en: 'GROUPS',    hi: 'ग्रुप' },
  'profile.settings':{ en: 'SETTINGS',  hi: 'सेटिंग्स' },
  'profile.theme':   { en: 'Theme',     hi: 'थीम' },
  'profile.language':{ en: 'Language',  hi: 'भाषा' },
  'profile.logout':  { en: 'Log Out',   hi: 'लॉग आउट' },
  'profile.logout_confirm': { en: 'Are you sure?', hi: 'क्या आप सुनिश्चित हैं?' },
  'profile.logout_sub': { en: "You'll need to authenticate again.", hi: 'आपको फिर से लॉगिन करना होगा।' },
  'profile.cancel':  { en: 'Cancel',    hi: 'रद्द करें' },
  'profile.dark':    { en: 'Dark',      hi: 'डार्क' },
  'profile.light':   { en: 'Light',     hi: 'लाइट' },
  'leader.queue_open':   { en: 'Queue Open',   hi: 'कतार खुली' },
  'leader.queue_closed': { en: 'Queue Closed', hi: 'कतार बंद' },
  'leader.reply':        { en: 'Reply to Messages', hi: 'संदेशों का उत्तर दें' },
  'leader.unreplied':    { en: 'Unreplied', hi: 'अनुत्तरित' },
  'leader.replied':      { en: 'Replied',   hi: 'उत्तरित' },
  'leader.send_reply':   { en: 'Send Reply', hi: 'उत्तर भेजें' },
  'common.all':     { en: 'All',     hi: 'सभी' },
  'common.newest':  { en: 'Newest',  hi: 'नवीनतम' },
  'common.oldest':  { en: 'Oldest',  hi: 'सबसे पुराना' },
  'common.filters': { en: 'Filters', hi: 'फ़िल्टर' },
  'common.reset':   { en: 'Reset filters', hi: 'फ़िल्टर रीसेट करें' },
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark', lang: 'en', isLight: false,
  setTheme: () => {}, setLang: () => {},
  t: (k) => k,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const savedTheme = localStorage.getItem('app_theme') as Theme | null;
      const savedLang = localStorage.getItem('app_lang') as Lang | null;
      if (savedTheme) apply(savedTheme);
      if (savedLang) setLangState(savedLang);
    } catch {
      // localStorage not available
    }
  }, []);

  const apply = (t: Theme) => {
    setThemeState(t);
    const root = document.documentElement;
    const body = document.body;
    if (t === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      body.style.backgroundColor = '#EEEEF7';
      body.style.color = '#1A1A4E';
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      body.style.backgroundColor = '#0A0A0F';
      body.style.color = '#F0EDE8';
    }
  };

  const setTheme = (t: Theme) => {
    apply(t);
    try { localStorage.setItem('app_theme', t); } catch {}
  };

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('app_lang', l); } catch {}
  };

  const t = (key: string): string =>
    translations[key]?.[lang] ?? translations[key]?.['en'] ?? key;

  return (
    <ThemeContext.Provider value={{ theme, lang, setTheme, setLang, t, isLight: theme === 'light' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
