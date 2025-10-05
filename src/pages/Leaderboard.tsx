import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Crown, Medal, Award, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface LeaderboardUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  rank: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [globalLeaderboard, setGlobalLeaderboard] = useState<LeaderboardUser[]>([]);
  const [friendsLeaderboard, setFriendsLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchLeaderboards();
    
    // Real-time updates
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchLeaderboards();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(session.user.id);
  };

  const fetchLeaderboards = async () => {
    try {
      setLoading(true);

      // Fetch global leaderboard (public profiles only)
      const { data: globalData, error: globalError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, total_xp")
        .eq("privacy_level", "public")
        .order("total_xp", { ascending: false })
        .limit(100);

      if (globalError) throw globalError;

      const rankedGlobal = (globalData || []).map((user, index) => ({
        ...user,
        rank: index + 1,
      }));

      setGlobalLeaderboard(rankedGlobal);

      // Fetch friends leaderboard
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // For now, just show current user until types regenerate
        const { data: currentUserData } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, total_xp")
          .eq("id", user.id)
          .single();

        if (currentUserData) {
          setFriendsLeaderboard([{ ...currentUserData, rank: 1 }]);
        }
      }
    } catch (error: any) {
      console.error("Error fetching leaderboards:", error);
      toast.error("Failed to load leaderboards");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Award className="h-5 w-5 text-orange-600" />;
    return null;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/50">1st</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/50">2nd</Badge>;
    if (rank === 3) return <Badge className="bg-orange-600/20 text-orange-600 border-orange-600/50">3rd</Badge>;
    return <Badge variant="outline">#{rank}</Badge>;
  };

  const renderLeaderboard = (users: LeaderboardUser[], emptyMessage: string) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-surface/50 rounded-xl animate-pulse" />
          ))}
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {users.map((user) => (
          <Card
            key={user.id}
            className={`p-4 transition-all hover:scale-[1.02] ${
              user.id === currentUserId
                ? "border-primary bg-primary/5"
                : "bg-surface/50"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-shrink-0">
                {getRankIcon(user.rank)}
                {getRankBadge(user.rank)}
              </div>

              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback>
                  {user.display_name?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {user.display_name || "Anonymous"}
                  {user.id === currentUserId && (
                    <span className="ml-2 text-sm text-muted-foreground">(You)</span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user.total_xp.toLocaleString()} XP
                </p>
              </div>

              {user.rank <= 3 && (
                <div className="flex-shrink-0">
                  {getRankIcon(user.rank)}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Leaderboard</h1>
            <p className="text-muted-foreground">Compete with others and climb the ranks</p>
          </div>
        </div>

        <Tabs defaultValue="global" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="global" className="gap-2">
              <Trophy className="h-4 w-4" />
              Global
            </TabsTrigger>
            <TabsTrigger value="friends" className="gap-2">
              <Users className="h-4 w-4" />
              Friends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global" className="mt-6">
            {renderLeaderboard(
              globalLeaderboard,
              "No public profiles yet. Be the first to make your profile public!"
            )}
          </TabsContent>

          <TabsContent value="friends" className="mt-6">
            {renderLeaderboard(
              friendsLeaderboard,
              "Add friends to see how you compare!"
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
