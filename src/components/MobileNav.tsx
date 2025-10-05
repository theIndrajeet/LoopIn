import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, Trophy, Users, User, LogOut, Zap, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NotificationBell } from "@/components/NotificationBell";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const MobileNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

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
    <nav className="fixed bottom-4 left-4 right-4 bg-elevated/80 backdrop-blur-heavy border border-border/40 rounded-3xl shadow-elevated md:hidden z-50 mx-auto max-w-md">
      <div className="flex justify-around items-center h-16 px-2">
        <button
          onClick={() => navigate("/dashboard")}
          className={`relative flex flex-col items-center gap-0.5 min-w-[52px] transition-all duration-300 py-1 ${
            isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {isActive("/dashboard") && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-pulse-glow" />
          )}
          <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive("/dashboard") ? "bg-primary/10 scale-110" : ""}`}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-medium transition-all ${isActive("/dashboard") ? "opacity-100" : "opacity-60"}`}>Habits</span>
        </button>
        
        <button
          onClick={() => navigate("/ai-assistant")}
          className={`relative flex flex-col items-center gap-0.5 min-w-[52px] transition-all duration-300 py-1 ${
            isActive("/ai-assistant") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {isActive("/ai-assistant") && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-pulse-glow" />
          )}
          <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive("/ai-assistant") ? "bg-primary/10 scale-110" : ""}`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-medium transition-all ${isActive("/ai-assistant") ? "opacity-100" : "opacity-60"}`}>AI</span>
        </button>
        
        <button
          onClick={() => navigate("/leaderboard")}
          className={`relative flex flex-col items-center gap-0.5 min-w-[52px] transition-all duration-300 py-1 ${
            isActive("/leaderboard") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {isActive("/leaderboard") && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-pulse-glow" />
          )}
          <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive("/leaderboard") ? "bg-primary/10 scale-110" : ""}`}>
            <Trophy className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-medium transition-all ${isActive("/leaderboard") ? "opacity-100" : "opacity-60"}`}>Ranks</span>
        </button>
        
        <button
          onClick={() => navigate("/friends")}
          className={`relative flex flex-col items-center gap-0.5 min-w-[52px] transition-all duration-300 py-1 ${
            isActive("/friends") ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {isActive("/friends") && (
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary animate-pulse-glow" />
          )}
          <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive("/friends") ? "bg-primary/10 scale-110" : ""}`}>
            <Users className="w-5 h-5" />
          </div>
          <span className={`text-[10px] font-medium transition-all ${isActive("/friends") ? "opacity-100" : "opacity-60"}`}>Friends</span>
        </button>

        <div className="flex flex-col items-center gap-0.5 min-w-[52px] py-1">
          <div className="p-2">
            <NotificationBell />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground opacity-60">Alerts</span>
        </div>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="flex flex-col items-center gap-0.5 min-w-[52px] transition-all duration-300 text-muted-foreground py-1"
            >
              <div className="p-2">
                <User className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium opacity-60">Profile</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Profile</SheetTitle>
            </SheetHeader>
            
            <div className="py-6 space-y-6">
              {/* User Info Section */}
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name} />
                  <AvatarFallback className="text-lg">
                    {profile?.display_name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{profile?.display_name || "User"}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {profile?.total_xp || 0} XP
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Edit Profile Section */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="edit-profile" className="border-none">
                  <AccordionTrigger className="text-base font-semibold">
                    Edit Profile
                  </AccordionTrigger>
                  <AccordionContent>
                    <ProfileEditForm profile={profile} onUpdate={fetchProfile} />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Separator />

              {/* Sign Out Button */}
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
