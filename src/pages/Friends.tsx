import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Check, X, Search, ArrowLeft, Flame } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
}

interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  profiles: Profile;
}

export default function Friends() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
      const { data: acceptedData } = await supabase
        .from("friendships")
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          profiles:friend_id (id, display_name, avatar_url, total_xp)
        `)
        .eq("user_id", user.id)
        .eq("status", "accepted");

      const { data: acceptedData2 } = await supabase
        .from("friendships")
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          profiles:user_id (id, display_name, avatar_url, total_xp)
        `)
        .eq("friend_id", user.id)
        .eq("status", "accepted");

      setFriends([...(acceptedData || []), ...(acceptedData2 || [])]);

      // Fetch pending requests (received)
      const { data: pendingData } = await supabase
        .from("friendships")
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          profiles:user_id (id, display_name, avatar_url, total_xp)
        `)
        .eq("friend_id", user.id)
        .eq("status", "pending");

      setPendingRequests(pendingData || []);

      // Fetch sent requests
      const { data: sentData } = await supabase
        .from("friendships")
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          profiles:friend_id (id, display_name, avatar_url, total_xp)
        `)
        .eq("user_id", user.id)
        .eq("status", "pending");

      setSentRequests(sentData || []);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, total_xp")
        .eq("privacy_level", "public")
        .neq("id", user.id)
        .ilike("display_name", `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error: any) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .insert({
          friend_id: friendId,
          status: "pending",
        });

      if (error) throw error;
      toast.success("Friend request sent!");
      fetchFriendships();
      setSearchResults([]);
      setSearchQuery("");
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request");
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId);

      if (error) throw error;
      toast.success("Friend request accepted!");
      fetchFriendships();
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      toast.error("Failed to accept request");
    }
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;
      toast.success("Friend request rejected");
      fetchFriendships();
    } catch (error: any) {
      console.error("Error rejecting friend request:", error);
      toast.error("Failed to reject request");
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendshipId);

      if (error) throw error;
      toast.success("Friend removed");
      fetchFriendships();
    } catch (error: any) {
      console.error("Error removing friend:", error);
      toast.error("Failed to remove friend");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Friends</h1>
            <p className="text-muted-foreground">Connect and compete with friends</p>
          </div>
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
                <div key={user.id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
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
                  <Button size="sm" onClick={() => sendFriendRequest(user.id)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="friends">
              Friends ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent ({sentRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-6 space-y-3">
            {friends.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No friends yet. Search and add some!</p>
              </div>
            ) : (
              friends.map((friendship) => {
                const profile = friendship.profiles as unknown as Profile;
                return (
                  <Card key={friendship.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback>{profile.display_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile.display_name || "Anonymous"}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Flame className="h-3 w-3" />
                            {profile.total_xp} XP
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => removeFriend(friendship.id)}>
                        Remove
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-6 space-y-3">
            {pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No pending requests</p>
              </div>
            ) : (
              pendingRequests.map((friendship) => {
                const profile = friendship.profiles as unknown as Profile;
                return (
                  <Card key={friendship.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback>{profile.display_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile.display_name || "Anonymous"}</p>
                          <Badge variant="outline">Pending</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="outline" onClick={() => acceptFriendRequest(friendship.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={() => rejectFriendRequest(friendship.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-6 space-y-3">
            {sentRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No sent requests</p>
              </div>
            ) : (
              sentRequests.map((friendship) => {
                const profile = friendship.profiles as unknown as Profile;
                return (
                  <Card key={friendship.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback>{profile.display_name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{profile.display_name || "Anonymous"}</p>
                          <Badge variant="outline">Awaiting response</Badge>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => rejectFriendRequest(friendship.id)}>
                        Cancel
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
