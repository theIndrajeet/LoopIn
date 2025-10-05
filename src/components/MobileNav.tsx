import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, Trophy, Users, User, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

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
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center gap-1 min-w-[60px] transition-colors text-muted-foreground"
            >
              <User className="w-6 h-6" />
              <span className="text-xs font-medium">Profile</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Profile</SheetTitle>
            </SheetHeader>
            <div className="py-6 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};
