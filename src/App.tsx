import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import ChatWidget from "./components/ChatWidget";
import Index from "./pages/Index";
import Product from "./pages/Product";
import Pricing from "./pages/Pricing";
import HowItWorksPage from "./pages/HowItWorksPage";
import About from "./pages/About";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AcceptInvitation from "./pages/AcceptInvitation";
import DashboardRouter from "./pages/DashboardRouter";
import Overview from "./pages/app/Overview";
import Insights from "./pages/app/Insights";
import Signals from "./pages/app/Signals";
import RiskFeed from "./pages/app/RiskFeed";
import Privacy from "./pages/app/Privacy";
import SelfCheck from "./pages/SelfCheck";
import NotFound from "./pages/NotFound";
import MonthlyReport from "./pages/MonthlyReport";
import CeoSummary from "./pages/CeoSummary";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SubscriptionProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/product" element={<Product />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<AcceptInvitation />} />
            <Route path="/dashboard" element={<DashboardRouter />} />
            <Route path="/app/overview" element={<Overview />} />
            <Route path="/app/insights" element={<Insights />} />
            <Route path="/app/signals" element={<Signals />} />
            <Route path="/app/risk-feed" element={<RiskFeed />} />
            <Route path="/app/privacy" element={<Privacy />} />
            <Route path="/app/monthly-report" element={<MonthlyReport />} />
            <Route path="/ceo-summary/:token" element={<CeoSummary />} />
            <Route path="/self-check" element={<SelfCheck />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          {/* AI Chat Widget - appears on all pages */}
          <ChatWidget />
        </BrowserRouter>
      </TooltipProvider>
    </SubscriptionProvider>
  </QueryClientProvider>
);

export default App;
