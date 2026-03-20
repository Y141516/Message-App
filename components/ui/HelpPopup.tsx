'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle } from 'lucide-react';

interface HelpPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: string[];
}

export default function HelpPopup({ isOpen, onClose, title, steps }: HelpPopupProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          {/* Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--bg-card)] border-t border-[var(--border)] rounded-t-3xl p-6 max-w-lg mx-auto"
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-[var(--border)] rounded-full mx-auto mb-5" />

            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                <HelpCircle className="w-4 h-4 text-[#C9A84C]" />
              </div>
              <h3 className="text-[var(--text-primary)] font-semibold text-base flex-1">{title}</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Steps */}
            <div className="space-y-3 pb-4">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <span className="w-5 h-5 rounded-full bg-[#C9A84C]/15 border border-[#C9A84C]/30 text-[#C9A84C] text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{step}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Screen-specific help content ────────────────────────
export const HELP_CONTENT: Record<string, { title: string; steps: string[] }> = {
  home: {
    title: 'How to use Home',
    steps: [
      'Your verified groups are shown at the top.',
      'When the queue is open, the "Send Message" button becomes active.',
      'Tap "Send Message" to write to a leader.',
      'Use Emergency buttons (Medical, Transport, Urgent) anytime — they bypass the queue.',
      'You can send a maximum of 3 emergency messages per day.',
      'Tap "Dashboard" to see your sent messages and replies.',
    ],
  },
  dashboard: {
    title: 'How to use Dashboard',
    steps: [
      '"Current" tab shows your latest message that has not received a reply yet.',
      '"Messages & Replies" tab shows all your past messages with their replies.',
      'Use filters to sort by newest/oldest or filter by text/audio replies.',
      'Tap the download button next to a reply to save it.',
      'Audio replies can be played directly in the app.',
    ],
  },
  send_message: {
    title: 'How to Send a Message',
    steps: [
      'Select which leader you want to send to.',
      'Type your message in the text box.',
      'Optionally attach a photo, video, audio file, document, or voice note.',
      'Tap "Send Message" to submit.',
      'You can only send one message per queue per leader.',
    ],
  },
  emergency: {
    title: 'Emergency Messages',
    steps: [
      'Emergency messages bypass the queue and are delivered immediately.',
      'Select the appropriate type: Medical, Transport, or Urgent.',
      'Choose which leader to send to.',
      'Write your message and tap Send.',
      'You are limited to 3 emergency messages per day.',
    ],
  },
  vachan: {
    title: 'Vachan Generator',
    steps: [
      'Each tap shows a randomly selected Vachan.',
      'Tap "New Vachan" to see a different one.',
    ],
  },
  profile: {
    title: 'Profile & Settings',
    steps: [
      'Your Telegram ID and group memberships are shown here.',
      'Switch between Dark and Light theme using the Theme toggle.',
      'Switch between English and Hindi using the Language toggle.',
      'Tap "Log Out" to sign out of the app.',
    ],
  },
  leader_dashboard: {
    title: 'Leader Dashboard',
    steps: [
      'Tap the power button to open or close the queue.',
      'Set the message limit before opening — this controls how many messages you accept.',
      'Once the limit is reached, the queue closes automatically.',
      'Tap "Reply to Messages" to see and reply to all pending messages.',
      'View detailed analytics by tapping the analytics section.',
    ],
  },
  leader_messages: {
    title: 'Messages List',
    steps: [
      '"Unreplied" tab shows messages waiting for your reply.',
      '"Replied" tab shows messages you have already responded to.',
      'Use filters to sort by newest/oldest, type, or city.',
      'Tap any message to open the reply screen.',
    ],
  },
  leader_reply: {
    title: 'Replying to a Message',
    steps: [
      'Read the full message from the user at the top.',
      'Choose "Text" to type a reply or "Audio" to record one.',
      'For audio: tap the mic button to start recording, tap stop when done.',
      'Preview your audio before sending.',
      'Tap "Send Reply" — the user will be notified on Telegram instantly.',
    ],
  },
};
