import { Toaster } from './components/ui/toaster';
import { Toaster as Sonner } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, ReactNode, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import ErrorBoundary from './components/ErrorBoundary';
import AnalyticsPageTracker from './components/AnalyticsPageTracker';
import ProtectedRoute from './components/ProtectedRoute';
import Index from './pages/Index';

const Product = lazy(() => import('./pages/Product'));
const Pricing = lazy(() => import('./pages/Pricing'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const About = lazy(() => import('./pages/About'));
const Trust = lazy(() => import('./pages/Trust'));
const AustraliaPsychosocialRisk = lazy(() => import('./pages/AustraliaPsychosocialRisk'));
const AustraliaPilot = lazy(() => import('./pages/AustraliaPilot'));
const AustraliaMonitoringGapAudit = lazy(() => import('./pages/AustraliaMonitoringGapAudit'));
const AustraliaInformationPage = lazy(() => import('./pages/AustraliaInformationPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const DashboardRouter = lazy(() => import('./pages/DashboardRouter'));
const Overview = lazy(() => import('./pages/app/Overview'));
const ExecutiveSummary = lazy(() => import('./pages/app/ExecutiveSummary'));
const LatestBrief = lazy(() => import('./pages/app/LatestBrief'));
const Insights = lazy(() => import('./pages/app/Insights'));
const Signals = lazy(() => import('./pages/app/Signals'));
const ActiveMonitoring = lazy(() => import('./pages/app/ActiveMonitoring'));
const Actions = lazy(() => import('./pages/app/Actions'));
const ManagerCoaching = lazy(() => import('./pages/app/ManagerCoaching'));
const Privacy = lazy(() => import('./pages/app/Privacy'));
const SignalCoverage = lazy(() => import('./pages/app/SignalCoverage'));
const Employees = lazy(() => import('./pages/app/Employees'));
const WorkNetwork = lazy(() => import('./pages/app/WorkNetwork'));
const SiteAnalytics = lazy(() => import('./pages/app/SiteAnalytics'));
const SelfCheck = lazy(() => import('./pages/SelfCheck'));
const NotFound = lazy(() => import('./pages/NotFound'));
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
const SeoLanding = lazy(() => import('./pages/SeoLanding'));
const SampleReport = lazy(() => import('./pages/SampleReport'));
const ServiceProcess = lazy(() => import('./pages/ServiceProcess'));
const PsychosocialRiskVisibilityReview = lazy(
  () => import('./pages/PsychosocialRiskVisibilityReview')
);

// Control-verification module (H&S / psychosocial risk).
const ControlReviews = lazy(() => import('./pages/app/controlReview/ControlReviews'));
const ControlReviewFindings = lazy(() => import('./pages/app/controlReview/ControlReviewFindings'));
const ControlReviewDetail = lazy(() => import('./pages/app/controlReview/ControlReviewDetail'));
const NewControlReview = lazy(() => import('./pages/app/controlReview/NewControlReview'));
const TrustPack = lazy(() => import('./pages/app/controlReview/TrustPack'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const withAuthentication = (page: ReactNode) => <ProtectedRoute>{page}</ProtectedRoute>;

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <SubscriptionProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AnalyticsPageTracker />
            <Suspense
              fallback={
                <div
                  className="flex min-h-screen items-center justify-center bg-[#F8FAFC]"
                  role="status"
                  aria-live="polite"
                >
                  <div className="rounded-xl border border-[#E2E8F0] bg-white px-6 py-4 text-sm font-semibold text-[#475569] shadow-sm">
                    Loading SignalTrue…
                  </div>
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/product" element={<Product />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/how-it-works" element={<HowItWorksPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/trust" element={<Trust />} />
                <Route path="/au" element={<AustraliaPsychosocialRisk />} />
                <Route path="/au/8-week-pilot" element={<AustraliaPilot />} />
                <Route path="/au/monitoring-gap-audit" element={<AustraliaMonitoringGapAudit />} />
                {[
                  '/au/psychosocial-risk-monitoring',
                  '/au/privacy',
                  '/au/worker-transparency',
                  '/au/security',
                  '/au/data-residency',
                  '/au/trust',
                  '/au/ai-governance',
                ].map((path) => (
                  <Route key={path} path={path} element={<AustraliaInformationPage />} />
                ))}
                <Route
                  path="/australia-psychosocial-risk"
                  element={<Navigate to="/au" replace />}
                />
                <Route
                  path="/psychosocial-risk-australia"
                  element={<Navigate to="/au" replace />}
                />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/register" element={<Register />} />
                <Route path="/onboarding" element={<AcceptInvitation />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardRouter />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/app"
                  element={withAuthentication(<Navigate to="/app/overview" replace />)}
                />
                <Route
                  path="/app/overview"
                  element={
                    <ProtectedRoute>
                      <Overview />
                    </ProtectedRoute>
                  }
                />
                <Route path="/app/latest-brief" element={withAuthentication(<LatestBrief />)} />
                <Route path="/app/insights" element={withAuthentication(<Insights />)} />
                <Route path="/app/insights/:teamId" element={withAuthentication(<Insights />)} />
                <Route path="/app/signals" element={withAuthentication(<Signals />)} />
                <Route path="/app/signals/:signalId" element={withAuthentication(<Signals />)} />
                <Route
                  path="/app/active-monitoring"
                  element={withAuthentication(<ActiveMonitoring />)}
                />
                <Route path="/app/risk-feed" element={withAuthentication(<ActiveMonitoring />)} />
                <Route path="/app/actions" element={withAuthentication(<Actions />)} />
                <Route
                  path="/app/manager-coaching"
                  element={withAuthentication(<ManagerCoaching />)}
                />
                <Route
                  path="/app/control-reviews"
                  element={withAuthentication(<ControlReviews />)}
                />
                <Route
                  path="/app/control-reviews/new"
                  element={withAuthentication(<NewControlReview />)}
                />
                <Route
                  path="/app/control-reviews/findings"
                  element={withAuthentication(<ControlReviewFindings />)}
                />
                <Route
                  path="/app/control-reviews/:caseId"
                  element={withAuthentication(<ControlReviewDetail />)}
                />
                <Route path="/app/trust-pack" element={withAuthentication(<TrustPack />)} />
                <Route
                  path="/app/executive-summary"
                  element={
                    <ProtectedRoute>
                      <ExecutiveSummary />
                    </ProtectedRoute>
                  }
                />
                <Route path="/app/privacy" element={withAuthentication(<Privacy />)} />
                <Route
                  path="/app/signal-coverage"
                  element={withAuthentication(<SignalCoverage />)}
                />
                <Route path="/app/employees" element={withAuthentication(<Employees />)} />
                <Route path="/app/work-network" element={withAuthentication(<WorkNetwork />)} />
                <Route
                  path="/app/methodology"
                  element={withAuthentication(<Navigate to="/app/overview" replace />)}
                />
                <Route
                  path="/app/validation"
                  element={withAuthentication(<Navigate to="/app/overview" replace />)}
                />
                <Route path="/app/site-analytics" element={withAuthentication(<SiteAnalytics />)} />
                <Route
                  path="/app/monthly-report"
                  element={withAuthentication(<Navigate to="/app/overview" replace />)}
                />
                <Route path="/ceo-summary/:token" element={<CeoSummary />} />
                <Route path="/superadmin" element={withAuthentication(<SuperadminDashboard />)} />
                <Route path="/team-analytics" element={withAuthentication(<TeamAnalyticsPage />)} />
                <Route path="/app/team-analytics" element={withAuthentication(<TeamAnalytics />)} />
                <Route path="/admin/onboarding" element={withAuthentication(<AdminOnboarding />)} />
                <Route path="/self-check" element={<SelfCheck />} />
                <Route path="/integrations" element={withAuthentication(<IntegrationsPage />)} />
                <Route
                  path="/integrations/callback"
                  element={withAuthentication(<IntegrationsPage />)}
                />
                <Route
                  path="/settings"
                  element={withAuthentication(<Navigate to="/integrations" replace />)}
                />
                <Route
                  path="/notifications"
                  element={withAuthentication(<Navigate to="/dashboard" replace />)}
                />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<Blog />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/demo" element={<Navigate to="/contact" replace />} />
                <Route path="/sample-report" element={<SampleReport />} />
                <Route
                  path="/psychosocial-risk-visibility-review"
                  element={<PsychosocialRiskVisibilityReview />}
                />
                <Route path="/client-success" element={<ServiceProcess />} />
                <Route
                  path="/burnout-early-warning-system"
                  element={<Navigate to="/au/psychosocial-risk-monitoring" replace />}
                />
                <Route path="/employee-engagement-leading-indicators" element={<SeoLanding />} />
                <Route path="/solutions" element={<SeoLanding />} />
                <Route path="/resources" element={<SeoLanding />} />
                <Route path="/signals/:signalSlug" element={<SeoLanding />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/ai-info-page" element={<Navigate to="/au/ai-governance" replace />} />
                <Route path="/drift-diagnostic" element={<DriftDiagnostic />} />
                <Route path="/drift-report/:sessionId" element={<DriftReport />} />
                <Route path="/ehrs-summit-2026" element={<EhrsSummit2026 />} />
                <Route
                  path="/app/engagement-strain"
                  element={withAuthentication(<EngagementStrainTeamDetail />)}
                />
                <Route
                  path="/app/engagement-strain/:teamId"
                  element={withAuthentication(<EngagementStrainTeamDetail />)}
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
