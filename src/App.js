import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import PublicRegister from './pages/PublicRegister';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MasterAdminDashboard from './pages/MasterAdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
// New marketing pages
import ProductOverview from './pages/ProductOverview';
import CapacityRiskDetection from './pages/CapacityRiskDetection';
import TeamAnalytics from './pages/TeamAnalytics';
import CompanyDashboard from './pages/CompanyDashboard';
import HowItWorks from './pages/HowItWorks';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Trust from './pages/Trust';
import Demo from './pages/Demo';
import Features from './pages/Features';
import PrivacySettingsPage from './pages/PrivacySettingsPage';
import AdminOnboarding from './pages/AdminOnboarding';
import OnboardingAccept from './pages/OnboardingAccept';
import AuthCallback from './pages/AuthCallback';
import DashboardMockup from './components/DashboardMockup';
import FirstSignal from './components/FirstSignal';
// New app pages
import Overview from './pages/app/Overview';
import Signals from './pages/app/Signals';
import RiskFeed from './pages/app/RiskFeed';
import AppPrivacy from './pages/app/Privacy';
import Insights from './pages/app/Insights';
import MarketingLayout from './components/layout/MarketingLayout';

import { Helmet, HelmetProvider } from 'react-helmet-async';

function PageMeta({ title, description }) {
  const defaultTitle = 'SignalTrue';
  const fullTitle = title ? `${title} | ${defaultTitle}` : defaultTitle;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
    </Helmet>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <Router>
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<MarketingLayout><PageMeta title="Catch capacity risk early" description="Run healthier teams with real-time signals from Slack and calendars." /><Home /></MarketingLayout>} />
          <Route path="/product" element={<MarketingLayout><PageMeta title="Product" description="See how SignalTrue helps you detect burnout, overload, and execution risks." /><ProductOverview /></MarketingLayout>} />
          <Route path="/capacity-risk-detection" element={<MarketingLayout><PageMeta title="Capacity Risk Detection" description="Identify and mitigate capacity risks within your team." /><CapacityRiskDetection /></MarketingLayout>} />
          <Route path="/burnout-detection" element={<MarketingLayout><CapacityRiskDetection /></MarketingLayout>} /> {/* Legacy redirect */}
          <Route path="/team-analytics" element={<MarketingLayout><PageMeta title="Team Analytics" description="Analyze team performance and well-being." /><TeamAnalytics /></MarketingLayout>} />
          <Route path="/company-dashboard" element={<MarketingLayout><PageMeta title="Company Dashboard" description="Overview of company-wide metrics and insights." /><CompanyDashboard /></MarketingLayout>} />
          <Route path="/how-it-works" element={<MarketingLayout><PageMeta title="How It Works" description="Learn how SignalTrue analyzes collaboration data to provide team-level insights." /><HowItWorks /></MarketingLayout>} />
          <Route path="/pricing" element={<MarketingLayout><PageMeta title="Pricing" description="Find the right plan for your team." /><Pricing /></MarketingLayout>} />
          <Route path="/about" element={<MarketingLayout><PageMeta title="About" description="Learn about our mission to help teams work smarter, not harder." /><About /></MarketingLayout>} />
          <Route path="/contact" element={<MarketingLayout><PageMeta title="Contact" description="Get in touch with our team." /><Contact /></MarketingLayout>} />
          <Route path="/terms" element={<MarketingLayout><PageMeta title="Terms of Service" description="Read our terms of service." /><Terms /></MarketingLayout>} />
          <Route path="/privacy" element={<MarketingLayout><PageMeta title="Privacy Policy" description="Read our privacy policy." /><Privacy /></MarketingLayout>} />
          <Route path="/trust" element={<MarketingLayout><PageMeta title="Trust" description="Learn how we protect your data." /><Trust /></MarketingLayout>} />
          <Route path="/demo" element={<MarketingLayout><PageMeta title="Demo" description="See SignalTrue in action." /><Demo /></MarketingLayout>} />
          <Route path="/features" element={<MarketingLayout><PageMeta title="Features" description="Explore the features of SignalTrue." /><Features /></MarketingLayout>} />
          <Route path="/privacy-settings" element={<MarketingLayout><PageMeta title="Privacy Settings" description="Manage your privacy settings." /><PrivacySettingsPage /></MarketingLayout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<PublicRegister />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<OnboardingAccept />} />
          <Route path="/dashboard-concept" element={<DashboardMockup />} />
  {/* OAuth callback catcher; forwards code to backend and redirects back */}
  <Route path="/auth/:provider/callback" element={<AuthCallback />} />
          <Route
            path="/first-signal"
            element={
              <ProtectedRoute>
                <FirstSignal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/onboarding"
            element={
              <ProtectedRoute>
                <AdminOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/risk-feed"
            element={
              <ProtectedRoute>
                <RiskFeed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/overview"
            element={
              <ProtectedRoute>
                <Overview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/signals"
            element={
              <ProtectedRoute>
                <Signals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/insights/:teamId"
            element={
              <ProtectedRoute>
                <Insights />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/privacy"
            element={
              <ProtectedRoute>
                <AppPrivacy />
              </ProtectedRoute>
            }
          />
          <Route
            path="/master-admin"
            element={
              <ProtectedRoute>
                <MasterAdminDashboard />
              </ProtectedRoute>
            }
          />
          {/* Keep internal /register-team for admin use */}
          <Route path="/register-team" element={<Register />} />
        </Routes>
        </ErrorBoundary>
      </Router>
    </HelmetProvider>
  );
}