import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, Trophy, Users, Flame } from "lucide-react";

export const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-elevated border-t border-border md:hidden z-50 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16 px-4">
        <button
          onClick={() => navigate("/dashboard")}
          className={`flex flex-col items-center gap-1 min-w-[60px] transition-colors ${
            isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <CheckCircle2 className="w-6 h-6" />
          <span className="text-xs font-medium">Habits</span>
        </button>
        
        <button
          onClick={() => navigate("/leaderboard")}
          className={`flex flex-col items-center gap-1 min-w-[60px] transition-colors ${
            isActive("/leaderboard") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Trophy className="w-6 h-6" />
          <span className="text-xs font-medium">Rankings</span>
        </button>
        
        <button
          onClick={() => navigate("/friends")}
          className={`flex flex-col items-center gap-1 min-w-[60px] transition-colors ${
            isActive("/friends") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Users className="w-6 h-6" />
          <span className="text-xs font-medium">Friends</span>
        </button>
      </div>
    </nav>
  );
};
