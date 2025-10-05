import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface TodayProgressRingProps {
  completed: number;
  total: number;
}

export const TodayProgressRing = ({ completed, total }: TodayProgressRingProps) => {
  const progress = total > 0 ? completed / total : 0;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress * circumference);
  
  const prefersReducedMotion = useMemo(() => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  return (
    <div className="flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth="12"
          fill="none"
          opacity="0.15"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          stroke="url(#gradient)"
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={prefersReducedMotion ? strokeDashoffset : circumference}
          strokeLinecap="round"
          initial={false}
          animate={{ 
            strokeDashoffset: strokeDashoffset 
          }}
          transition={{ 
            duration: prefersReducedMotion ? 0 : 0.8, 
            ease: [0.34, 1.56, 0.64, 1]
          }}
          style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.4))' }}
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(356 90% 60%)" />
          </linearGradient>
        </defs>
        
        {/* Center text */}
        <text
          x="70"
          y="70"
          textAnchor="middle"
          dominantBaseline="middle"
          className="text-3xl font-bold fill-foreground"
          transform="rotate(90 70 70)"
        >
          {completed}/{total}
        </text>
      </svg>
    </div>
  );
};
