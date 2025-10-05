import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, Zap } from 'lucide-react';

interface MilestoneProps {
  show: boolean;
  streakCount: number;
  onClose: () => void;
}

export const StreakMilestone = ({ show, streakCount, onClose }: MilestoneProps) => {
  const getMilestoneData = (count: number) => {
    if (count === 7) return { 
      icon: Flame, 
      title: "Week Warrior! 🔥", 
      subtitle: "7 days strong!" 
    };
    if (count === 30) return { 
      icon: Trophy, 
      title: "Month Master! 🏆", 
      subtitle: "30 days of dedication!" 
    };
    if (count === 100) return { 
      icon: Zap, 
      title: "Century Streak! ⚡", 
      subtitle: "100 days unstoppable!" 
    };
    return null;
  };

  const milestone = getMilestoneData(streakCount);
  if (!show || !milestone) return null;

  const Icon = milestone.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15 
          }}
          className="bg-gradient-to-br from-gold/20 to-primary/20 border-4 border-gold rounded-2xl p-8 max-w-sm mx-4 text-center"
          onClick={e => e.stopPropagation()}
        >
          <motion.div
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{ 
              duration: 0.6, 
              repeat: Infinity,
              repeatDelay: 1
            }}
          >
            <Icon className="w-24 h-24 mx-auto text-gold mb-4" />
          </motion.div>
          
          <h2 className="text-3xl font-bold text-gold mb-2">
            {milestone.title}
          </h2>
          <p className="text-xl text-muted-foreground mb-6">
            {milestone.subtitle}
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="px-8 py-3 bg-gradient-to-r from-gold to-primary rounded-full text-white font-semibold"
          >
            Keep Going! 🚀
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
