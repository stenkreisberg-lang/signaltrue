import { Toaster } from './components/ui/toaster';
import { Toaster as Sonner } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import ErrorBoundary from './components/ErrorBoundary';
import AnalyticsPageTracker from './components/AnalyticsPageTracker';
import Index from './pages/Index';

const Product = lazy(() => import('./pages/Product'));
const Pricing = lazy(() => import('./pages/Pricing'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const About = lazy(() => import('./pages/About'));
const Trust = lazy(() => import('./pages/Trust'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const DashboardRouter = lazy(() => import('./pages/DashboardRouter'));
const Overview = lazy(() => import('./pages/app/Overview'));
const Insights = lazy(() => import('./pages/app/Insights'));
const Signals = lazy(() => import('./pages/app/Signals'));
const ActiveMonitoring = lazy(() => import('./pages/app/ActiveMonitoring'));
const Actions = lazy(() => import('./pages/app/Actions'));
const ExecutiveSummary = lazy(() => import('./pages/app/ExecutiveSummary'));
const Privacy = lazy(() => import('./pages/app/Privacy'));
const SignalCoverage = lazy(() => import('./pages/app/SignalCoverage'));
const SiteAnalytics = lazy(() => import('./pages/app/SiteAnalytics'));
const SelfCheck = lazy(() => import('./pages/SelfCheck'));
const NotFound = lazy(() => import('./pages/NotFound'));
const MonthlyReport = lazy(() => import('./pages/MonthlyReport'));
const CeoSummary = lazy(() => import('./pages/CeoSummary'));
const SuperadminDashboard = lazy(() => import('./pages/SuperadminDashboard'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const TeamAnalytics = lazy(() => import('./pages/TeamAnalytics'));
const TeamAnalyticsPage = lazy(() => import('./pages/TeamAnalyticsPage'));
const AdminOnboarding = lazy(() => import('./pages/AdminOnboarding'));
const IntegrationsPage = lazy(() => import('./pages/IntegrationsPage'));
const Blog = lazy(() => import('./pages/Blog'));
const Contact = lazy(() => import('./pages/Contact'));
const DriftDiagnostic = lazy(() => import('./pages/DriftDiagnostic'));
const DriftReport = lazy(() => import('./pages/DriftReport'));
const EhrsSummit2026 = lazy(() => import('./pages/EhrsSummit2026'));
const EngagementStrainTeamDetail = lazy(() => import('./pages/app/EngagementStrainTeamDetail'));
const ChatWidget = lazy(() => import('./components/ChatWidget'));

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
            <AnalyticsPageTracker />
            <Suspense fallback={<div className="min-h-screen bg-background" />}>
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
                <Route path="/app" element={<Navigate to="/app/overview" replace />} />
                <Route path="/app/overview" element={<Overview />} />
                <Route path="/app/insights" element={<Insights />} />
                <Route path="/app/insights/:teamId" element={<Insights />} />
                <Route path="/app/signals" element={<Signals />} />
                <Route path="/app/signals/:signalId" element={<Signals />} />
                <Route path="/app/active-monitoring" element={<ActiveMonitoring />} />
                <Route path="/app/risk-feed" element={<ActiveMonitoring />} />
                <Route path="/app/actions" element={<Actions />} />
                <Route path="/app/executive-summary" element={<ExecutiveSummary />} />
                <Route path="/app/privacy" element={<Privacy />} />
                <Route path="/app/signal-coverage" element={<SignalCoverage />} />
                <Route path="/app/site-analytics" element={<SiteAnalytics />} />
                <Route path="/app/monthly-report" element={<MonthlyReport />} />
                <Route path="/ceo-summary/:token" element={<CeoSummary />} />
                <Route path="/superadmin" element={<SuperadminDashboard />} />
                <Route path="/team-analytics" element={<TeamAnalyticsPage />} />
                <Route path="/app/team-analytics" element={<TeamAnalytics />} />
                <Route path="/admin/onboarding" element={<AdminOnboarding />} />
                <Route path="/self-check" element={<SelfCheck />} />
                <Route path="/integrations" element={<IntegrationsPage />} />
                <Route path="/integrations/callback" element={<IntegrationsPage />} />
                <Route path="/settings" element={<Navigate to="/integrations" replace />} />
                <Route path="/notifications" element={<Navigate to="/dashboard" replace />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<Blog />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/demo" element={<Navigate to="/contact" replace />} />
                <Route path="/drift-diagnostic" element={<DriftDiagnostic />} />
                <Route path="/drift-report/:sessionId" element={<DriftReport />} />
                <Route path="/ehrs-summit-2026" element={<EhrsSummit2026 />} />
                <Route path="/app/engagement-strain" element={<EngagementStrainTeamDetail />} />
                <Route
                  path="/app/engagement-strain/:teamId"
                  element={<EngagementStrainTeamDetail />}
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <ChatWidget />
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </SubscriptionProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
