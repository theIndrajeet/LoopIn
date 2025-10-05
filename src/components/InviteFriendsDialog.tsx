import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Link2, Mail } from "lucide-react";
import { InviteLinkSection } from "./InviteLinkSection";
import { EmailInviteForm } from "./EmailInviteForm";

interface InviteFriendsDialogProps {
  userId: string;
}

export function InviteFriendsDialog({ userId }: InviteFriendsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Friends
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="link" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">
              <Link2 className="h-4 w-4 mr-2" />
              Share Link
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="h-4 w-4 mr-2" />
              Email Invite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="mt-4">
            <InviteLinkSection userId={userId} />
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <EmailInviteForm onSuccess={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
