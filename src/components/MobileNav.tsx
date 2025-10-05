import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, Trophy, Users, User, LogOut, Zap } from "lucide-react";
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
