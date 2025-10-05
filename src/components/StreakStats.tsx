import { Flame, Trophy, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

interface StreakStatsProps {
  currentStreak: number;
  bestStreak: number;
  completionRate: { completed: number; total: number };
}

export const StreakStats = ({ currentStreak, bestStreak, completionRate }: StreakStatsProps) => {
  const percentage = Math.round((completionRate.completed / completionRate.total) * 100);

  return (
    <div className="grid grid-cols-1 gap-3">
      <Card className="p-4 bg-elevated border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">Current Streak</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-elevated border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/20 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-gold" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{bestStreak}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
        </div>
      </Card>

      <Card className="p-4 bg-elevated border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{percentage}%</p>
            <p className="text-xs text-muted-foreground">
              {completionRate.completed}/{completionRate.total} days
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
