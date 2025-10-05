import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Flame, Moon, Sun, Sunrise, Sunset, Zap, Battery, BatteryMedium, BatteryLow } from "lucide-react";
import { motion } from "framer-motion";

const GOALS_OPTIONS = [
  { value: "health", label: "Get healthier", emoji: "💪", description: "Fitness, nutrition, sleep" },
  { value: "skills", label: "Build skills", emoji: "📚", description: "Learning, reading, practice" },
  { value: "wellness", label: "Mental wellness", emoji: "🧘", description: "Meditation, journaling, breathwork" },
  { value: "productivity", label: "Be more productive", emoji: "⚡", description: "Focus, time management, routines" },
  { value: "social", label: "Social connections", emoji: "🤝", description: "Relationships, community, networking" },
  { value: "creativity", label: "Creative pursuits", emoji: "🎨", description: "Art, music, writing, making" },
];

const SCHEDULE_OPTIONS = [
  { value: "early_bird", label: "Early bird", icon: Sunrise, description: "Best in mornings (5am-9am)" },
  { value: "day_person", label: "Day person", icon: Sun, description: "Peak midday (9am-5pm)" },
  { value: "night_owl", label: "Night owl", icon: Moon, description: "Alive at night (8pm-12am)" },
  { value: "shift_worker", label: "Shift worker", icon: Sunset, description: "Variable schedule" },
];

const ENERGY_OPTIONS = [
  { value: "high", label: "High energy", icon: Battery, description: "Ready for challenges, 20-30min habits" },
  { value: "medium", label: "Medium energy", icon: BatteryMedium, description: "Balanced, 10-20min habits" },
  { value: "low", label: "Low/recovering", icon: BatteryLow, description: "Taking it easy, ≤10min habits" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState("");
  const [energyLevel, setEnergyLevel] = useState("");

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();

    if (prefs?.onboarding_completed) {
      navigate("/dashboard");
    }
  };

  const handleGoalToggle = (goal: string) => {
    if (selectedGoals.includes(goal)) {
      setSelectedGoals(selectedGoals.filter(g => g !== goal));
    } else {
      if (selectedGoals.length < 3) {
        setSelectedGoals([...selectedGoals, goal]);
      } else {
        toast.error("Maximum 3 goals allowed");
      }
    }
  };

  const handleNext = () => {
    if (step === 1 && selectedGoals.length === 0) {
      toast.error("Please select at least one goal");
      return;
    }
    if (step === 2 && !scheduleType) {
      toast.error("Please select your schedule type");
      return;
    }
    setStep(step + 1);
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          onboarding_completed: true,
        });

      await supabase.from("suggestion_events").insert({
        user_id: user.id,
        suggestion_id: "onboarding",
        suggestion_type: "onboarding",
        action: "skip",
        metadata: {},
      });

      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (!energyLevel) {
      toast.error("Please select your energy level");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("user_preferences")
        .upsert({
          user_id: user.id,
          primary_goals: selectedGoals,
          schedule_type: scheduleType,
          energy_level: energyLevel,
          onboarding_completed: true,
        });

      await supabase.from("suggestion_events").insert({
        user_id: user.id,
        suggestion_id: "onboarding",
        suggestion_type: "onboarding",
        action: "complete",
        metadata: {
          goals: selectedGoals,
          schedule_type: scheduleType,
          energy_level: energyLevel,
        },
      });

      toast.success("All set! Let's build great habits");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-xl border-primary/10">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-primary" />
                <span className="font-bold text-xl">Loop Level</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`h-2 w-12 rounded-full transition-all ${
                      s <= step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">
                {step === 1 && "What do you want more of right now?"}
                {step === 2 && "Which best matches your day?"}
                {step === 3 && "Be honest—how much fuel in the tank?"}
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {step === 1 && "Select up to 3 goals to personalize your suggestions"}
                {step === 2 && "We'll suggest habits at the right time for you"}
                {step === 3 && "This helps us match difficulty to your current energy"}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOALS_OPTIONS.map((goal) => (
                  <motion.button
                    key={goal.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleGoalToggle(goal.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedGoals.includes(goal.value)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{goal.emoji}</span>
                      <div>
                        <div className="font-medium">{goal.label}</div>
                        <div className="text-sm text-muted-foreground">{goal.description}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}

            {step === 2 && (
              <RadioGroup value={scheduleType} onValueChange={setScheduleType}>
                <div className="space-y-3">
                  {SCHEDULE_OPTIONS.map((option) => (
                    <motion.div
                      key={option.value}
                      whileHover={{ scale: 1.01 }}
                      className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        scheduleType === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setScheduleType(option.value)}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <option.icon className="w-6 h-6 text-primary" />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </Label>
                    </motion.div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {step === 3 && (
              <RadioGroup value={energyLevel} onValueChange={setEnergyLevel}>
                <div className="space-y-3">
                  {ENERGY_OPTIONS.map((option) => (
                    <motion.div
                      key={option.value}
                      whileHover={{ scale: 1.01 }}
                      className={`flex items-center space-x-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        energyLevel === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setEnergyLevel(option.value)}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <option.icon className="w-6 h-6 text-primary" />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-muted-foreground">{option.description}</div>
                      </Label>
                    </motion.div>
                  ))}
                </div>
              </RadioGroup>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={loading}
                className="flex-1"
              >
                Skip for now
              </Button>
              {step < 3 ? (
                <Button onClick={handleNext} className="flex-1">
                  Next
                </Button>
              ) : (
                <Button onClick={handleFinish} disabled={loading} className="flex-1">
                  {loading ? "Saving..." : "Finish"}
                </Button>
              )}
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Answering takes 15s and makes suggestions 3× better
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Onboarding;
