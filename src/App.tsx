import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import Friends from "./pages/Friends";
import InviteLanding from "./pages/InviteLanding";
import NotFound from "./pages/NotFound";
import AIAssistant from "./pages/AIAssistant";
import { MobileNav } from "@/components/MobileNav";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { FirstTimeNotificationPrompt } from "@/components/FirstTimeNotificationPrompt";
// import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineIndicator />
        <FirstTimeNotificationPrompt />
          {/* <PerformanceMonitor /> */}
        <main id="main-content">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/ai-assistant" element={<AIAssistant />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/invite/:userId" element={<InviteLanding />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <MobileNav />
        <InstallPrompt />
      </TooltipProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
