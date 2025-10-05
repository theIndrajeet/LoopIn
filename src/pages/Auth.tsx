import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Flame, Zap, Trophy } from "lucide-react";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast({
          title: "Welcome aboard! 🎉",
          description: "Your account has been created. Let's build some streaks!",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({
          title: "Welcome back! 🔥",
          description: "Ready to continue your streak?",
        });
      }
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Oops!",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding */}
        <div className="hidden md:flex flex-col justify-center text-white space-y-6">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tight">
              Loop Level
            </h1>
            <p className="text-2xl font-medium opacity-90">
              Build habits. Earn streaks. Level up your life.
            </p>
          </div>

          <div className="space-y-4 pt-8">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
                <Flame className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-lg">Keep Your Streak</p>
                <p className="text-white/80">Never miss a day, build momentum</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-lg">Earn XP & Level Up</p>
                <p className="text-white/80">Every completion brings rewards</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
                <Trophy className="w-8 h-8" />
              </div>
              <div>
                <p className="font-semibold text-lg">Compete & Win</p>
                <p className="text-white/80">Weekly leagues, challenges & more</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <Card className="shadow-glow border-2 border-white/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">
              {isSignUp ? "Create your account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Start your journey to better habits"
                : "Continue building your streaks"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="transition-all focus:shadow-glow"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="transition-all focus:shadow-glow"
                />
              </div>
              <Button
                type="submit"
                className="w-full text-lg font-semibold"
                disabled={loading}
              >
                {loading
                  ? "Loading..."
                  : isSignUp
                  ? "Create Account"
                  : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
