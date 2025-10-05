import { useState, useEffect } from "react";
import { Lightbulb, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { QuickPicksSection } from "./QuickPicksSection";
import { supabase } from "@/integrations/supabase/client";

interface FloatingSuggestionFABProps {
  habitCount: number;
  onHabitCreated: () => void;
}

export const FloatingSuggestionFAB = ({ habitCount, onHabitCreated }: FloatingSuggestionFABProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Auto-open if < 3 habits and hasn't been shown this session
    if (habitCount < 3 && !autoOpened && !sessionStorage.getItem("fab_auto_opened")) {
      setTimeout(() => {
        setIsOpen(true);
        setAutoOpened(true);
        sessionStorage.setItem("fab_auto_opened", "true");
      }, 1500);
    }
  }, [habitCount, autoOpened]);

  const handleOpen = async () => {
    setIsOpen(true);
    
    // Track impression
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("suggestion_events").insert({
        user_id: user.id,
        suggestion_type: "fab_interaction",
        action: "suggest_impression",
        suggestion_id: "fab",
        metadata: { placement: "fab" }
      });
    }
  };

  const content = (
    <QuickPicksSection onHabitCreated={() => {
      onHabitCreated();
      setIsOpen(false);
    }} />
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile FAB */}
        <Button
          onClick={handleOpen}
          className="fixed bottom-20 right-4 h-14 px-5 rounded-full shadow-glow-primary animate-pulse z-40 bg-primary hover:bg-primary/90"
          size="lg"
        >
          <Lightbulb className="w-5 h-5 mr-2" />
          Try this
        </Button>

        <Drawer open={isOpen} onOpenChange={setIsOpen}>
          <DrawerContent className="max-h-[70vh]">
            <DrawerHeader>
              <DrawerTitle className="text-xl">Quick picks for you</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-8 overflow-y-auto">
              {content}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {/* Desktop FAB */}
      <Button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 h-14 px-5 rounded-full shadow-glow-primary animate-pulse z-40 bg-primary hover:bg-primary/90"
        size="lg"
      >
        <Lightbulb className="w-5 h-5 mr-2" />
        Try this
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-[380px] sm:w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl">Quick picks for you</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {content}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};