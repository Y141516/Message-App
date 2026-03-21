'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Phone, ChevronRight, CheckCircle2, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useUserStore } from '@/store/userStore';
import toast from 'react-hot-toast';

type Step = 'welcome' | 'name' | 'city' | 'phone' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const { setUser } = useUserStore();

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('onboarding_data');
    if (!raw) { router.replace('/'); return; }
    const data = JSON.parse(raw);
    setOnboardingData(data);
    // Pre-fill name from Telegram
    if (data.telegramUser?.first_name) {
      const fullName = [data.telegramUser.first_name, data.telegramUser.last_name].filter(Boolean).join(' ');
      setName(fullName);
    }
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (!city.trim()) { toast.error('Please enter your city'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: onboardingData.telegramId,
          name: name.trim(),
          city: city.trim(),
          phone: phone.trim() || null,
          telegramUser: onboardingData.telegramUser,
          internalGroupIds: onboardingData.internalGroups?.map((g: any) => g.id) ?? [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setUser(data.user);
      sessionStorage.removeItem('onboarding_data');
      setStep('done');

      setTimeout(() => router.replace('/home'), 1800);
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = { welcome: 0, name: 1, city: 2, phone: 3, done: 4 };
  const totalSteps = 3;
  const currentStepNum = Math.min(steps[step], totalSteps);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C9A84C]/5 rounded-full blur-3xl" />
      </div>

      {/* Progress bar */}
      {step !== 'welcome' && step !== 'done' && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-[var(--bg-card)] z-50">
          <motion.div
            className="h-full bg-gradient-to-r from-[#C9A84C] to-[#E8C97A]"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStepNum / totalSteps) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">

          {/* WELCOME STEP */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-sm text-center"
            >
              {/* Logo */}
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 mx-auto mb-8 relative"
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#C9A84C] to-[#8A6F2E] opacity-30 blur-xl animate-pulse" />
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[#C9A84C]/20 to-[#8A6F2E]/20 border border-[#C9A84C]/40 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-[#C9A84C]" />
                </div>
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-[#C9A84C] text-sm font-medium tracking-widest uppercase mb-3"
              >
                Jay Bhagwanji
              </motion.p>

              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-[var(--text-primary)] mb-4"
                style={{ fontFamily: 'Cinzel, serif' }}
              >
                Welcome
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-[var(--text-secondary)] text-sm leading-relaxed mb-10"
              >
                Your groups have been verified. Let&apos;s set up your profile to get started.
              </motion.p>

              {/* Groups preview */}
              {onboardingData?.internalGroups?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl p-4 mb-8 text-left"
                >
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">Your Groups</p>
                  {onboardingData.internalGroups.map((g: any) => (
                    <div key={g.id} className="flex items-center gap-2 py-1.5">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span className="text-[var(--text-primary)] text-sm">{g.name}</span>
                    </div>
                  ))}
                </motion.div>
              )}

              <Button
                variant="gold"
                fullWidth
                size="lg"
                onClick={() => setStep('name')}
              >
                Get Started
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {/* NAME STEP */}
          {step === 'name' && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mb-6">
                <User className="w-5 h-5 text-[#C9A84C]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Your Name</h2>
              <p className="text-[var(--text-secondary)] text-sm mb-8">How should we address you?</p>

              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<User className="w-4 h-4" />}
                maxLength={60}
              />

              <div className="flex gap-3 mt-8">
                <Button variant="ghost" onClick={() => setStep('welcome')} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="gold"
                  onClick={() => {
                    if (!name.trim()) { toast.error('Please enter your name'); return; }
                    setStep('city');
                  }}
                  className="flex-2 flex-1"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* CITY STEP */}
          {step === 'city' && (
            <motion.div
              key="city"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mb-6">
                <MapPin className="w-5 h-5 text-[#C9A84C]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Your City</h2>
              <p className="text-[var(--text-secondary)] text-sm mb-8">Which city are you from?</p>

              <Input
                label="City"
                placeholder="e.g. Mumbai, Delhi, Surat"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                icon={<MapPin className="w-4 h-4" />}
                maxLength={60}
              />

              <div className="flex gap-3 mt-8">
                <Button variant="ghost" onClick={() => setStep('name')} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="gold"
                  onClick={() => {
                    if (!city.trim()) { toast.error('Please enter your city'); return; }
                    setStep('phone');
                  }}
                  className="flex-1"
                >
                  Continue
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* PHONE STEP */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-sm"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mb-6">
                <Phone className="w-5 h-5 text-[#C9A84C]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Phone Number</h2>
              <p className="text-[var(--text-secondary)] text-sm mb-2">Optional — you can skip this.</p>
              <p className="text-[var(--text-muted)] text-xs mb-8">Your number will only be visible to admins.</p>

              <Input
                label="Phone Number (Optional)"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                icon={<Phone className="w-4 h-4" />}
                maxLength={15}
              />

              <div className="flex gap-3 mt-8">
                <Button variant="ghost" onClick={() => setStep('city')} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="gold"
                  onClick={handleSubmit}
                  loading={loading}
                  className="flex-1"
                >
                  Finish Setup
                </Button>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full mt-4 text-[var(--text-muted)] text-sm hover:text-[var(--text-secondary)] transition-colors py-2"
              >
                Skip for now
              </button>
            </motion.div>
          )}

          {/* DONE STEP */}
          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className="w-full max-w-sm text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center"
              >
                <CheckCircle2 className="w-12 h-12 text-green-400" />
              </motion.div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Jay Bhagwanji, {name}!</h2>
              <p className="text-[var(--text-secondary)] text-sm">Your profile is set up. Taking you home...</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
