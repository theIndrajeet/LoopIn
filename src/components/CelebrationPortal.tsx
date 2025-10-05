import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CompletionConfetti } from './CompletionConfetti';
import type { CelebrationType } from '@/lib/celebrationEvents';

interface CelebrationPortalProps {
  show: boolean;
  type: CelebrationType;
  meta?: {
    habitTitle?: string;
    streakCount?: number;
    level?: number;
    xp?: number;
  };
  onDismiss: () => void;
}

const getEmoji = (type: CelebrationType) => {
  switch (type) {
    case 'first_completion':
      return '🎉';
    case 'personal_best':
      return '🏆';
    case 'level_up':
      return '⚡';
    case 'streak_milestone':
      return '🔥';
    default:
      return '🎊';
  }
};

const getMessage = (type: CelebrationType, meta?: CelebrationPortalProps['meta']) => {
  switch (type) {
    case 'first_completion':
      return `First ${meta?.habitTitle || 'habit'} completed!`;
    case 'personal_best':
      return `New personal best!`;
    case 'level_up':
      return `Level ${meta?.level || 0} Reached!`;
    case 'streak_milestone':
      return `${meta?.streakCount || 0} Day Streak! 🔥`;
    default:
      return 'Amazing!';
  }
};

const getConfettiIntensity = (type: CelebrationType): 'low' | 'medium' | 'high' => {
  switch (type) {
    case 'first_completion':
      return 'high';
    case 'level_up':
      return 'high';
    case 'streak_milestone':
      return 'medium';
    default:
      return 'medium';
  }
};

export const CelebrationPortal = ({ show, type, meta, onDismiss }: CelebrationPortalProps) => {
  useEffect(() => {
    if (!show) return;
    
    const timer = setTimeout(onDismiss, 1500);
    return () => clearTimeout(timer);
  }, [show, onDismiss]);

  if (!show) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 cursor-pointer"
      >
        <CompletionConfetti show={true} intensity={getConfettiIntensity(type)} />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="text-center pointer-events-none"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-8xl mb-4"
          >
            {getEmoji(type)}
          </motion.div>
          <h2 className="text-3xl font-bold text-white drop-shadow-lg">
            {getMessage(type, meta)}
          </h2>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
