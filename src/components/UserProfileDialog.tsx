import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Flame, Trophy, Target, UserPlus, UserMinus, Clock, CheckCircle2, XCircle } from "lucide-react";

interface UserProfileDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  privacy_level: "public" | "private" | "friends";
}

interface UserStats {
  activeHabitsCount: number;
  bestStreak: number;
  currentStreakTotal: number;
}

type FriendshipStatus = "none" | "pending_sent" | "pending_received" | "accepted";

export const UserProfileDialog = ({ userId, open, onOpenChange }: UserProfileDialogProps) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>("none");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchUserProfile();
      checkFriendshipStatus();
    }
  }, [open, userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, total_xp, privacy_level")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch stats (only if public or own profile)
      if (profileData.privacy_level === "public" || user?.id === userId) {
        await fetchUserStats();
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast.error("Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      // Fetch active habits count
      const { data: habits } = await supabase
        .from("habits")
        .select("id")
        .eq("user_id", userId)
        .eq("active", true)
        .is("deleted_at", null);

      // Fetch streaks
      const { data: streaks } = await supabase
        .from("streaks")
        .select("current_count, best_count")
        .in("habit_id", habits?.map(h => h.id) || []);

      const bestStreak = streaks?.reduce((max, s) => Math.max(max, s.best_count), 0) || 0;
      const currentStreakTotal = streaks?.reduce((sum, s) => sum + s.current_count, 0) || 0;

      setStats({
        activeHabitsCount: habits?.length || 0,
        bestStreak,
        currentStreakTotal,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  const checkFriendshipStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id === userId) return;

      const { data: friendships } = await supabase
        .from("friendships")
        .select("user_id, friend_id, status")
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`);

      if (!friendships || friendships.length === 0) {
        setFriendshipStatus("none");
        return;
      }

      const friendship = friendships[0];
      if (friendship.status === "accepted") {
        setFriendshipStatus("accepted");
      } else if (friendship.user_id === user.id) {
        setFriendshipStatus("pending_sent");
      } else {
        setFriendshipStatus("pending_received");
      }
    } catch (error) {
      console.error("Error checking friendship status:", error);
    }
  };

  const sendFriendRequest = async () => {
    try {
      setActionLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: userId,
        requester_id: user.id,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") {
          toast.info("Friend request already sent!");
        } else {
          throw error;
        }
      } else {
        toast.success("Friend request sent! 🎉");
        setFriendshipStatus("pending_sent");
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request");
    } finally {
      setActionLoading(false);
    }
  };

  const acceptRequest = async () => {
    try {
      setActionLoading(true);
      const { error } = await supabase.rpc("accept_friend_request", {
        friend_user_id: userId,
      });

      if (error) throw error;
      toast.success("Friend request accepted! 🎉");
      setFriendshipStatus("accepted");
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Failed to accept request");
    } finally {
      setActionLoading(false);
    }
  };

  const rejectRequest = async () => {
    try {
      setActionLoading(true);
      const { error } = await supabase.rpc("reject_friend_request", {
        friend_user_id: userId,
      });

      if (error) throw error;
      toast.success("Friend request rejected");
      setFriendshipStatus("none");
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    } finally {
      setActionLoading(false);
    }
  };

  const removeFriend = async () => {
    try {
      setActionLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`);

      if (error) throw error;
      toast.success("Friend removed");
      setFriendshipStatus("none");
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Failed to remove friend");
    } finally {
      setActionLoading(false);
    }
  };

  const renderActionButton = () => {
    if (currentUserId === userId) return null;

    switch (friendshipStatus) {
      case "none":
        return (
          <Button onClick={sendFriendRequest} disabled={actionLoading} className="w-full">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Friend
          </Button>
        );
      case "pending_sent":
        return (
          <Button variant="outline" disabled className="w-full">
            <Clock className="w-4 h-4 mr-2" />
            Request Sent
          </Button>
        );
      case "pending_received":
        return (
          <div className="flex gap-2">
            <Button onClick={acceptRequest} disabled={actionLoading} className="flex-1">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Accept
            </Button>
            <Button onClick={rejectRequest} disabled={actionLoading} variant="outline" className="flex-1">
              <XCircle className="w-4 h-4 mr-2" />
              Decline
            </Button>
          </div>
        );
      case "accepted":
        return (
          <Button onClick={removeFriend} disabled={actionLoading} variant="destructive" className="w-full">
            <UserMinus className="w-4 h-4 mr-2" />
            Remove Friend
          </Button>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-primary">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl">
                  {profile.display_name?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-2xl font-bold">{profile.display_name || "Anonymous"}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Trophy className="w-4 h-4 text-gold" />
                  <span className="text-lg font-semibold text-gold">{profile.total_xp} XP</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            {stats && (profile.privacy_level === "public" || currentUserId === userId) ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Target className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-2xl font-bold">{stats.activeHabitsCount}</div>
                  <div className="text-xs text-muted-foreground">Active Habits</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Trophy className="w-5 h-5 mx-auto mb-1 text-gold" />
                  <div className="text-2xl font-bold">{stats.bestStreak}</div>
                  <div className="text-xs text-muted-foreground">Best Streak</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Flame className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                  <div className="text-2xl font-bold">{stats.currentStreakTotal}</div>
                  <div className="text-xs text-muted-foreground">Total Streaks</div>
                </div>
              </div>
            ) : profile.privacy_level === "private" && currentUserId !== userId ? (
              <div className="bg-muted/50 rounded-lg p-4 text-center text-sm text-muted-foreground">
                This profile is private
              </div>
            ) : null}

            {/* Friendship Status Badge */}
            {friendshipStatus === "accepted" && (
              <Badge variant="secondary" className="w-full justify-center">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Friends
              </Badge>
            )}

            {/* Action Button */}
            {renderActionButton()}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            User not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
