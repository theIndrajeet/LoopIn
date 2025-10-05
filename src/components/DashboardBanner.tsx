import { useState } from 'react';
import { X, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardBannerProps {
  onOpenSuggestions: () => void;
}

export const DashboardBanner = ({ onOpenSuggestions }: DashboardBannerProps) => {
  const [dismissed, setDismissed] = useState(
    sessionStorage.getItem('dashboard_banner_dismissed') === 'true'
  );

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('dashboard_banner_dismissed', 'true');
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mb-6"
      >
        <Card className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  All done today! 🎉
                </h3>
                <p className="text-sm text-muted-foreground">
                  Want to add one for tomorrow?
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                onClick={onOpenSuggestions}
                size="sm"
                className="shadow-glow-primary"
              >
                Browse Ideas
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};
