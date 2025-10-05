import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ConfettiProps {
  show: boolean;
  intensity: 'low' | 'medium' | 'high';
}

export const CompletionConfetti = ({ show, intensity }: ConfettiProps) => {
  const [particles, setParticles] = useState<any[]>([]);

  useEffect(() => {
    if (!show) return;
    
    const count = { low: 15, medium: 30, high: 50 }[intensity];
    const colors = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--gold))', 'hsl(217 91% 60%)', 'hsl(271 91% 65%)'];
    
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: -20,
      rotation: Math.random() * 360,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 8,
      delay: Math.random() * 0.2,
    }));
    
    setParticles(newParticles);
    
    // Clear after animation
    setTimeout(() => setParticles([]), 2000);
  }, [show, intensity]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ 
            x: p.x, 
            y: p.y, 
            rotate: 0, 
            opacity: 1 
          }}
          animate={{ 
            y: window.innerHeight + 100,
            rotate: p.rotation + 720,
            opacity: 0,
          }}
          transition={{ 
            duration: 1.5 + Math.random() * 0.5,
            delay: p.delay,
            ease: "easeIn"
          }}
          style={{
            position: 'absolute',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: '50%',
          }}
        />
      ))}
    </div>
  );
};
