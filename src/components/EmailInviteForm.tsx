import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface EmailInviteFormProps {
  onSuccess?: () => void;
}

export function EmailInviteForm({ onSuccess }: EmailInviteFormProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.functions.invoke("send-friend-invite", {
        body: { email, inviterName: user.email?.split("@")[0] || "A friend" },
      });

      if (error) throw error;

      toast.success("Invitation sent successfully!");
      setEmail("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error sending invite:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={sendInvite} className="space-y-4">
      <div>
        <Label htmlFor="email">Friend's Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="friend@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2"
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        <Mail className="h-4 w-4 mr-2" />
        {loading ? "Sending..." : "Send Invitation"}
      </Button>
    </form>
  );
}
