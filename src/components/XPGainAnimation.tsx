import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface XPGainProps {
  show: boolean;
  xp: number;
  onComplete?: () => void;
}

export const XPGainAnimation = ({ show, xp, onComplete }: XPGainProps) => {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: 0, y: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1], 
            y: -60,
            opacity: [0, 1, 1, 0]
          }}
          exit={{ opacity: 0 }}
          transition={{ 
            duration: 1.5,
            times: [0, 0.3, 0.7, 1]
          }}
          onAnimationComplete={onComplete}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
        >
          <div className="flex items-center gap-2 bg-gold/20 border-2 border-gold rounded-full px-6 py-3 backdrop-blur-sm">
            <Sparkles className="w-6 h-6 text-gold animate-spin" />
            <span className="text-2xl font-bold text-gold">
              +{xp} XP
            </span>
            <Sparkles className="w-6 h-6 text-gold animate-spin" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
