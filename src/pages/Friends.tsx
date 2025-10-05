import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Check, X, Search, ArrowLeft, Flame, UserMinus } from "lucide-react";
import { InviteFriendsDialog } from "@/components/InviteFriendsDialog";
import { ActivityFeed } from "@/components/ActivityFeed";
import { UserProfileDialog } from "@/components/UserProfileDialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { FriendCardSkeleton } from "@/components/skeletons/FriendCardSkeleton";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
}

export default function Friends() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Profile[]>([]);
  const [sentRequests, setSentRequests] = useState<Profile[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchFriendships();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(session.user.id);
  };

  const fetchFriendships = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch accepted friends
      const { data: friendData } = await supabase
        .from("friendships")
        .select(`
          friend_id,
          profiles!friendships_friend_id_fkey(id, display_name, avatar_url, total_xp)
        `)
        .eq("user_id", user.id)
        .eq("status", "accepted");

      const friends = friendData?.map((f: any) => f.profiles).filter(Boolean) || [];
      setFriends(friends);

      // Fetch pending requests (received)
      const { data: pendingData } = await supabase
        .from("friendships")
        .select(`
          requester_id,
          profiles!friendships_requester_id_fkey(id, display_name, avatar_url, total_xp)
        `)
        .eq("friend_id", user.id)
        .eq("status", "pending");

      const pending = pendingData?.map((p: any) => p.profiles).filter(Boolean) || [];
      setPendingRequests(pending);

      // Fetch sent requests
      const { data: sentData } = await supabase
        .from("friendships")
        .select(`
          friend_id,
          profiles!friendships_friend_id_fkey(id, display_name, avatar_url, total_xp)
        `)
        .eq("requester_id", user.id)
        .eq("status", "pending");

      const sent = sentData?.map((s: any) => s.profiles).filter(Boolean) || [];
      setSentRequests(sent);
    } catch (error: any) {
      console.error("Error fetching friendships:", error);
      toast.error("Failed to load friends");
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, total_xp")
        .neq("id", user.id)
        .ilike("display_name", `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
    } finally {
      setSearching(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[Friends] Sending friend request:', { from: user.id, to: friendId });

      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: friendId,
        requester_id: user.id,
        status: "pending",
      });

      if (error) {
        console.error('[Friends] Error sending request:', error);
        if (error.code === "23505") {
          toast.info("Friend request already sent!");
        } else {
          throw error;
        }
      } else {
        console.log('[Friends] Friend request sent successfully');
        toast.success("Friend request sent! 🎉");
        setSearchResults([]);
        setSearchQuery("");
        fetchFriendships();
      }
    } catch (error: any) {
      console.error("[Friends] Error sending friend request:", error);
      toast.error("Failed to send friend request");
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (userId: string) => {
    try {
      setLoading(true);
      console.log('[Friends] Accepting friend request from:', userId);

      const { error } = await supabase.rpc("accept_friend_request", {
        friend_user_id: userId,
      });

      if (error) {
        console.error('[Friends] Error accepting request:', error);
        throw error;
      }

      console.log('[Friends] Friend request accepted successfully');
      
      // Verify bidirectional friendship was created
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: friendships } = await supabase
          .from("friendships")
          .select("*")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
        
        console.log('[Friends] All friendships after accept:', friendships);
      }

      toast.success("Friend request accepted! 🎉");
      fetchFriendships();
    } catch (error: any) {
      console.error("[Friends] Error accepting request:", error);
      toast.error("Failed to accept request");
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async (userId: string) => {
    try {
      const { error } = await supabase.rpc("reject_friend_request", {
        friend_user_id: userId,
      });

      if (error) throw error;
      toast.success("Friend request rejected");
      fetchFriendships();
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

      if (error) throw error;
      toast.success("Friend removed");
      fetchFriendships();
    } catch (error: any) {
      console.error("Error removing friend:", error);
      toast.error("Failed to remove friend");
    }
  };

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setProfileDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Friends</h1>
              <p className="text-muted-foreground">Connect and compete with friends</p>
            </div>
          </div>
          {currentUserId && <InviteFriendsDialog userId={currentUserId} />}
        </div>

        <Card className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                className="pl-9"
              />
            </div>
            <Button onClick={searchUsers}>Search</Button>
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((user) => (
                <div 
                  key={user.id} 
                  onClick={() => handleUserClick(user.id)}
                  className="flex items-center justify-between p-3 bg-surface rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{user.display_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.display_name || "Anonymous"}</p>
                      <p className="text-sm text-muted-foreground">{user.total_xp} XP</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      sendFriendRequest(user.id);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-2">
            <TabsTrigger value="friends" className="text-xs sm:text-sm">
              <Users className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Friends</span> ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">
              <UserPlus className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Requests</span> ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent" className="text-xs sm:text-sm">
              <Check className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Sent</span> ({sentRequests.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm">
              <Flame className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-6 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <FriendCardSkeleton key={i} />
                ))}
              </div>
            ) : friends.length === 0 ? (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground mb-2">No friends yet</p>
                <p className="text-sm text-muted-foreground">Send friend requests to connect with others!</p>
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05 }
                  }
                }}
                className="space-y-3"
              >
                {friends.map((friend) => (
                  <motion.div
                    key={friend.id}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      show: { opacity: 1, x: 0 }
                    }}
                  >
                    <Card 
                      onClick={() => handleUserClick(friend.id)}
                      className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={friend.avatar_url || undefined} />
                        <AvatarFallback>{friend.display_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{friend.display_name || "Anonymous"}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Flame className="h-3 w-3" />
                          {friend.total_xp} XP
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFriend(friend.id);
                      }}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-6 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <FriendCardSkeleton key={i} />
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-muted-foreground">No pending requests</p>
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05 }
                  }
                }}
                className="space-y-3"
              >
                {pendingRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      show: { opacity: 1, x: 0 }
                    }}
                  >
                <Card 
                  key={request.id} 
                  onClick={() => handleUserClick(request.id)}
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={request.avatar_url || undefined} />
                        <AvatarFallback>{request.display_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{request.display_name || "Anonymous"}</p>
                        <p className="text-sm text-muted-foreground">{request.total_xp} XP</p>
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button 
                        size="sm" 
                        onClick={() => acceptRequest(request.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => rejectRequest(request.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-6 space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <FriendCardSkeleton key={i} />
                ))}
              </div>
            ) : sentRequests.length === 0 ? (
              <motion.div 
                className="text-center py-12"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <p className="text-muted-foreground">No sent requests</p>
              </motion.div>
            ) : (
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: { staggerChildren: 0.05 }
                  }
                }}
                className="space-y-3"
              >
                {sentRequests.map((request) => (
                  <motion.div
                    key={request.id}
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      show: { opacity: 1, x: 0 }
                    }}
                  >
                <Card 
                  key={request.id} 
                  onClick={() => handleUserClick(request.id)}
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.avatar_url || undefined} />
                      <AvatarFallback>{request.display_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{request.display_name || "Anonymous"}</p>
                      <p className="text-sm text-muted-foreground">
                        <Badge variant="secondary">Pending</Badge>
                      </p>
                    </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card className="p-6">
              <ActivityFeed />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedUserId && (
        <UserProfileDialog
          userId={selectedUserId}
          open={profileDialogOpen}
          onOpenChange={setProfileDialogOpen}
        />
      )}
    </div>
  );
}
