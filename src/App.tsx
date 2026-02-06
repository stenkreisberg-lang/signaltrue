import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SubscriptionProvider } from "./contexts/SubscriptionContext";
import ErrorBoundary from "./components/ErrorBoundary";
import ChatWidget from "./components/ChatWidget";
import Index from "./pages/Index";
import Product from "./pages/Product";
import Pricing from "./pages/Pricing";
import HowItWorksPage from "./pages/HowItWorksPage";
import About from "./pages/About";
import Trust from "./pages/Trust";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AcceptInvitation from "./pages/AcceptInvitation";
import DashboardRouter from "./pages/DashboardRouter";
import Overview from "./pages/app/Overview";
import Insights from "./pages/app/Insights";
import Signals from "./pages/app/Signals";
import ActiveMonitoring from "./pages/app/ActiveMonitoring";
import Actions from "./pages/app/Actions";
import ExecutiveSummary from "./pages/app/ExecutiveSummary";
import Privacy from "./pages/app/Privacy";
import SelfCheck from "./pages/SelfCheck";
import NotFound from "./pages/NotFound";
import MonthlyReport from "./pages/MonthlyReport";
import CeoSummary from "./pages/CeoSummary";
import SuperadminDashboard from "./pages/SuperadminDashboard";
import ForgotPassword from "./pages/ForgotPassword";
import TeamAnalytics from "./pages/TeamAnalytics";
import TeamAnalyticsPage from "./pages/TeamAnalyticsPage";
import AdminOnboarding from "./pages/AdminOnboarding";
import IntegrationsPage from "./pages/IntegrationsPage";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import DriftDiagnostic from "./pages/DriftDiagnostic";
import DriftReport from "./pages/DriftReport";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary>
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
              <Route path="/trust" element={<Trust />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/register" element={<Register />} />
              <Route path="/onboarding" element={<AcceptInvitation />} />
              <Route path="/dashboard" element={<DashboardRouter />} />
              <Route path="/app/overview" element={<Overview />} />
              <Route path="/app/insights" element={<Insights />} />
              <Route path="/app/insights/:teamId" element={<Insights />} />
              <Route path="/app/signals" element={<Signals />} />
              <Route path="/app/active-monitoring" element={<ActiveMonitoring />} />
              <Route path="/app/risk-feed" element={<ActiveMonitoring />} /> {/* Legacy redirect */}
              <Route path="/app/actions" element={<Actions />} />
              <Route path="/app/executive-summary" element={<ExecutiveSummary />} />
              <Route path="/app/privacy" element={<Privacy />} />
              <Route path="/app/monthly-report" element={<MonthlyReport />} />
              <Route path="/ceo-summary/:token" element={<CeoSummary />} />
              <Route path="/superadmin" element={<SuperadminDashboard />} />
              <Route path="/team-analytics" element={<TeamAnalyticsPage />} />
              <Route path="/app/team-analytics" element={<TeamAnalytics />} />
              <Route path="/admin/onboarding" element={<AdminOnboarding />} />
              <Route path="/self-check" element={<SelfCheck />} />
              <Route path="/integrations" element={<IntegrationsPage />} />
              <Route path="/integrations/callback" element={<IntegrationsPage />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<Blog />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/drift-diagnostic" element={<DriftDiagnostic />} />
              <Route path="/drift-report/:sessionId" element={<DriftReport />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            {/* AI Chat Widget - appears on all pages */}
            <ChatWidget />
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
