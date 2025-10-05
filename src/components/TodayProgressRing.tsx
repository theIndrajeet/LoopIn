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
          strokeWidth="10"
          fill="none"
          opacity="0.2"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx="70"
          cy="70"
          r={radius}
          stroke="hsl(var(--primary))"
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={prefersReducedMotion ? strokeDashoffset : circumference}
          strokeLinecap="round"
          initial={false}
          animate={{ 
            strokeDashoffset: strokeDashoffset 
          }}
          transition={{ 
            duration: prefersReducedMotion ? 0 : 0.6, 
            ease: "easeOut" 
          }}
        />
        
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
