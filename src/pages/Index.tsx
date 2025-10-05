import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Flame, Zap, Trophy, Target, Users, BarChart3 } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <div className="animate-pulse text-2xl font-semibold text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero text-white">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={heroImage} 
            alt="Motivational habit tracking" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="container relative mx-auto px-4 py-24">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <div className="inline-block mb-4">
              <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium">
                🎯 Build Better Habits, Level Up Your Life
              </div>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight">
              Loop Level
            </h1>
            
            <p className="text-2xl md:text-3xl font-medium opacity-95 leading-relaxed">
              Turn your daily habits into an epic adventure.<br />
              Track streaks. Earn XP. Compete with friends.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90 shadow-glow"
              >
                Start Your Journey
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="text-lg px-8 py-6 border-2 border-white text-white hover:bg-white/10"
              >
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Loop Level?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We make habit building addictive by turning it into a game you actually want to play.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-2xl shadow-card hover:shadow-glow transition-all">
              <div className="bg-gradient-streak w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Flame className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Build Streaks</h3>
              <p className="text-muted-foreground">
                Never miss a day. Watch your streak grow and feel the momentum build with every completion.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-card hover:shadow-glow transition-all">
              <div className="bg-gradient-hero w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Earn XP</h3>
              <p className="text-muted-foreground">
                Every habit completion earns you experience points. Level up and unlock achievements as you grow.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-card hover:shadow-glow transition-all">
              <div className="bg-primary w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Compete & Win</h3>
              <p className="text-muted-foreground">
                Join weekly leagues and challenges. Compete with friends and climb the leaderboards.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-card hover:shadow-glow transition-all">
              <div className="bg-accent w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Daily Challenges</h3>
              <p className="text-muted-foreground">
                Get fresh quests every day to keep things interesting and earn bonus XP for your efforts.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-card hover:shadow-glow transition-all">
              <div className="bg-secondary w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Stay Accountable</h3>
              <p className="text-muted-foreground">
                Connect with friends, send nudges, and support each other on your habit-building journey.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl shadow-card hover:shadow-glow transition-all">
              <div className="bg-gradient-hero w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Track Progress</h3>
              <p className="text-muted-foreground">
                Visualize your growth with detailed stats, charts, and insights into your habit patterns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl font-bold mb-6">Ready to Level Up?</h2>
          <p className="text-2xl mb-10 opacity-95">
            Join thousands building better habits, one day at a time.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="text-lg px-10 py-7 bg-white text-primary hover:bg-white/90 shadow-glow"
          >
            Get Started Free
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
