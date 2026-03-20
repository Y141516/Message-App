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
}

// ─── All UI label translations ────────────────────────────
const translations: Record<string, Record<Lang, string>> = {
  // Nav
  'nav.home': { en: 'Home', hi: 'होम' },
  'nav.messages': { en: 'Messages', hi: 'संदेश' },
  'nav.vachan': { en: 'Vachan', hi: 'वचन' },
  'nav.profile': { en: 'Profile', hi: 'प्रोफाइल' },
  'nav.dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड' },
  // Home
  'home.greeting': { en: 'Jay Bhagwanji', hi: 'जय भगवानजी' },
  'home.groups': { en: 'Your Groups', hi: 'आपके ग्रुप' },
  'home.verified': { en: 'Verified', hi: 'सत्यापित' },
  'home.queue_open': { en: 'Queue is Open', hi: 'कतार खुली है' },
  'home.queue_closed': { en: 'Queue is Closed', hi: 'कतार बंद है' },
  'home.queue_open_sub': { en: 'accepting messages', hi: 'संदेश स्वीकार हो रहे हैं' },
  'home.queue_closed_sub': { en: 'Messages not accepted right now', hi: 'अभी संदेश स्वीकार नहीं हो रहे' },
  'home.send_message': { en: 'Send Message', hi: 'संदेश भेजें' },
  'home.send_message_sub': { en: 'Tap to compose a message', hi: 'संदेश लिखने के लिए टैप करें' },
  'home.queue_closed_btn': { en: 'Queue is currently closed', hi: 'कतार अभी बंद है' },
  'home.emergency': { en: 'Emergency Services', hi: 'आपातकालीन सेवाएं' },
  'home.always_active': { en: 'Always Active', hi: 'हमेशा सक्रिय' },
  'home.medical': { en: 'Medical', hi: 'चिकित्सा' },
  'home.transport': { en: 'Transport', hi: 'परिवहन' },
  'home.urgent': { en: 'Urgent', hi: 'अत्यावश्यक' },
  'home.emergency_limit': { en: 'Max 3 emergency messages per day', hi: 'प्रतिदिन अधिकतम 3 आपातकालीन संदेश' },
  // Dashboard
  'dashboard.title': { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'dashboard.current': { en: 'Current', hi: 'वर्तमान' },
  'dashboard.history': { en: 'Messages & Replies', hi: 'संदेश और उत्तर' },
  'dashboard.to': { en: 'To', hi: 'को' },
  'dashboard.awaiting': { en: 'Awaiting reply from', hi: 'से उत्तर की प्रतीक्षा' },
  'dashboard.your_message': { en: 'Your Message', hi: 'आपका संदेश' },
  'dashboard.reply': { en: 'Reply', hi: 'उत्तर' },
  'dashboard.download_pdf': { en: 'Download as PDF', hi: 'PDF में डाउनलोड करें' },
  'dashboard.download_audio': { en: 'Download Audio', hi: 'ऑडियो डाउनलोड करें' },
  'dashboard.no_pending': { en: 'No pending messages', hi: 'कोई लंबित संदेश नहीं' },
  'dashboard.no_replies': { en: 'No replied messages', hi: 'कोई उत्तरित संदेश नहीं' },
  'dashboard.send_first': { en: 'Send a Message', hi: 'संदेश भेजें' },
  'dashboard.filters': { en: 'Filters', hi: 'फ़िल्टर' },
  // Send Message
  'send.title': { en: 'Send Message', hi: 'संदेश भेजें' },
  'send.send_to': { en: 'Send To', hi: 'को भेजें' },
  'send.select_leader': { en: 'Select a leader...', hi: 'नेता चुनें...' },
  'send.message': { en: 'Message', hi: 'संदेश' },
  'send.attach': { en: 'Attach', hi: 'संलग्न करें' },
  'send.optional': { en: '(optional)', hi: '(वैकल्पिक)' },
  'send.record_voice': { en: 'Record Voice Note', hi: 'वॉइस नोट रिकॉर्ड करें' },
  'send.send_btn': { en: 'Send Message', hi: 'संदेश भेजें' },
  'send.send_emergency': { en: 'Send Emergency Message', hi: 'आपातकालीन संदेश भेजें' },
  'send.sent': { en: 'Message Sent!', hi: 'संदेश भेजा गया!' },
  'send.placeholder': { en: 'Write your message here...', hi: 'यहाँ अपना संदेश लिखें...' },
  // Profile
  'profile.title': { en: 'Profile', hi: 'प्रोफाइल' },
  'profile.name': { en: 'Name', hi: 'नाम' },
  'profile.telegram_id': { en: 'Telegram ID', hi: 'टेलीग्राम ID' },
  'profile.phone': { en: 'Phone', hi: 'फ़ोन' },
  'profile.city': { en: 'City', hi: 'शहर' },
  'profile.groups': { en: 'Groups', hi: 'ग्रुप' },
  'profile.settings': { en: 'Settings', hi: 'सेटिंग्स' },
  'profile.theme': { en: 'Theme', hi: 'थीम' },
  'profile.language': { en: 'Language', hi: 'भाषा' },
  'profile.logout': { en: 'Log Out', hi: 'लॉग आउट' },
  'profile.logout_confirm': { en: 'Are you sure?', hi: 'क्या आप सुनिश्चित हैं?' },
  'profile.logout_sub': { en: "You'll need to authenticate again.", hi: 'आपको फिर से लॉगिन करना होगा।' },
  'profile.cancel': { en: 'Cancel', hi: 'रद्द करें' },
  'profile.dark': { en: 'Dark', hi: 'डार्क' },
  'profile.light': { en: 'Light', hi: 'लाइट' },
  // Vachan
  'vachan.title': { en: 'Vachan', hi: 'वचन' },
  'vachan.new': { en: 'New Vachan', hi: 'नया वचन' },
  // Leader
  'leader.queue_open': { en: 'Queue Open', hi: 'कतार खुली' },
  'leader.queue_closed': { en: 'Queue Closed', hi: 'कतार बंद' },
  'leader.open_queue': { en: 'Open Queue', hi: 'कतार खोलें' },
  'leader.close_queue': { en: 'Close Queue', hi: 'कतार बंद करें' },
  'leader.reply': { en: 'Reply to Messages', hi: 'संदेशों का उत्तर दें' },
  'leader.unreplied': { en: 'Unreplied', hi: 'अनुत्तरित' },
  'leader.replied': { en: 'Replied', hi: 'उत्तरित' },
  'leader.send_reply': { en: 'Send Reply', hi: 'उत्तर भेजें' },
  'leader.text': { en: 'Text', hi: 'टेक्स्ट' },
  'leader.audio': { en: 'Audio', hi: 'ऑडियो' },
  // Common
  'common.back': { en: 'Back', hi: 'वापस' },
  'common.save': { en: 'Save', hi: 'सहेजें' },
  'common.cancel': { en: 'Cancel', hi: 'रद्द करें' },
  'common.loading': { en: 'Loading...', hi: 'लोड हो रहा है...' },
  'common.filters': { en: 'Filters', hi: 'फ़िल्टर' },
  'common.newest': { en: 'Newest', hi: 'नवीनतम' },
  'common.oldest': { en: 'Oldest', hi: 'सबसे पुराना' },
  'common.all': { en: 'All', hi: 'सभी' },
  'common.reset': { en: 'Reset filters', hi: 'फ़िल्टर रीसेट करें' },
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark', lang: 'en',
  setTheme: () => {}, setLang: () => {},
  t: (k) => k,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [lang, setLangState] = useState<Lang>('en');

  // Load from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('app_theme') as Theme | null;
    const savedLang = localStorage.getItem('app_lang') as Lang | null;
    if (savedTheme) setThemeState(savedTheme);
    if (savedLang) setLangState(savedLang);
  }, []);

  // Apply theme to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('app_theme', t);
  };

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('app_lang', l);
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] ?? translations[key]?.['en'] ?? key;
  };

  return (
    <ThemeContext.Provider value={{ theme, lang, setTheme, setLang, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
