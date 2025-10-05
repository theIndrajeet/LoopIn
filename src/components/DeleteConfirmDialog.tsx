import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  habitName: string;
  currentStreak: number;
  bestStreak: number;
  totalLogs: number;
}

export const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  habitName,
  currentStreak,
  bestStreak,
  totalLogs,
}: DeleteConfirmDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const isValid = confirmText === habitName;

  const handleConfirm = () => {
    if (isValid) {
      onConfirm();
      setConfirmText("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Permanently Delete Habit
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-semibold text-foreground">
              This will move "{habitName}" to Trash for 30 days.
            </p>
            
            <div className="bg-muted/50 p-3 rounded-md space-y-1.5 text-sm">
              <p><span className="font-medium">Logs to archive:</span> {totalLogs} completions</p>
              <p><span className="font-medium">Current streak:</span> {currentStreak} days (will end)</p>
              <p><span className="font-medium">Best streak:</span> {bestStreak} days (kept as history)</p>
              <p><span className="font-medium">XP earned:</span> Stays on your profile</p>
            </div>

            <p className="text-xs">
              You can restore from Trash within 30 days. After that, all data is permanently deleted.
            </p>

            <div className="pt-2">
              <Label htmlFor="confirm-name" className="text-sm font-medium">
                Type <span className="font-mono font-semibold">{habitName}</span> to confirm
              </Label>
              <Input
                id="confirm-name"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={habitName}
                className="mt-2"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Move to Trash
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
