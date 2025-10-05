import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function InviteLanding() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [inviter, setInviter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadInviter();
  }, [userId]);

  const loadInviter = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, total_xp")
        .eq("id", userId)
        .single();

      setInviter(data);
    } catch (error) {
      console.error("Error loading inviter:", error);
      toast.error("Invalid invite link");
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth", { state: { inviteUserId: userId } });
      return;
    }

    setSending(true);
    try {
      // Create friendship request
      const { error } = await supabase.from("friendships").insert({
        user_id: user.id,
        friend_id: userId,
        requester_id: user.id,
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") {
          toast.info("Friend request already sent or you're already friends!");
        } else {
          throw error;
        }
      } else {
        toast.success("Friend request sent!");
      }

      navigate("/friends");
    } catch (error: any) {
      console.error("Error accepting invite:", error);
      toast.error("Failed to send friend request");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inviter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Invalid Invite</h1>
          <p className="text-muted-foreground mb-6">This invite link is not valid or has expired.</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="p-8 text-center max-w-md w-full">
        <Avatar className="h-24 w-24 mx-auto mb-4">
          <AvatarImage src={inviter.avatar_url || undefined} />
          <AvatarFallback className="text-2xl">
            {inviter.display_name?.charAt(0).toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        
        <h1 className="text-2xl font-bold mb-2">
          {inviter.display_name || "A friend"} invited you!
        </h1>
        
        <p className="text-muted-foreground mb-6">
          Join the habit tracking journey and connect with your friend to build better habits together.
        </p>

        <div className="bg-surface p-4 rounded-lg mb-6">
          <p className="text-sm text-muted-foreground mb-1">Total XP</p>
          <p className="text-2xl font-bold text-primary">{inviter.total_xp}</p>
        </div>

        <Button 
          onClick={acceptInvite} 
          className="w-full" 
          size="lg"
          disabled={sending}
        >
          {sending ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Sending Request...
            </>
          ) : (
            <>
              <UserPlus className="h-5 w-5 mr-2" />
              Accept Invite & Connect
            </>
          )}
        </Button>
      </Card>
    </div>
  );
}
