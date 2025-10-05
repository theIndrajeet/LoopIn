import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "react-qr-code";

interface InviteLinkSectionProps {
  userId: string;
}

export function InviteLinkSection({ userId }: InviteLinkSectionProps) {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}/invite/${userId}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on Habit Tracker!",
          text: "Let's build better habits together!",
          url: inviteLink,
        });
      } catch (error) {
        // User cancelled or share failed
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Share this link with friends to invite them to connect with you
        </p>
        
        <div className="flex gap-2">
          <Input value={inviteLink} readOnly className="flex-1" />
          <Button onClick={copyToClipboard} variant="outline" size="icon">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button onClick={shareLink} variant="outline" size="icon">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-muted-foreground">Or scan this QR code</p>
        <div className="bg-white p-4 rounded-lg">
          <QRCode value={inviteLink} size={200} />
        </div>
      </div>
    </div>
  );
}
