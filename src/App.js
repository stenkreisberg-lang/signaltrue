import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import PublicRegister from './pages/PublicRegister';
import MasterAdminDashboard from './pages/MasterAdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
// New marketing pages
import ProductOverview from './pages/ProductOverview';
import BurnoutDetection from './pages/BurnoutDetection';
import TeamAnalytics from './pages/TeamAnalytics';
import CompanyDashboard from './pages/CompanyDashboard';
import HowItWorks from './pages/HowItWorksClean';
import Pricing from './pages/Pricing';
import About from './pages/About';
import Contact from './pages/Contact';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import PrivacySettingsPage from './pages/PrivacySettingsPage';
import AdminOnboarding from './pages/AdminOnboarding';
import OnboardingAccept from './pages/OnboardingAccept';
import AuthCallback from './pages/AuthCallback';

export default function App() {
  return (
    <Router>
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product" element={<ProductOverview />} />
        <Route path="/burnout-detection" element={<BurnoutDetection />} />
        <Route path="/team-analytics" element={<TeamAnalytics />} />
        <Route path="/company-dashboard" element={<CompanyDashboard />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/terms" element={<Terms />} />
  <Route path="/privacy" element={<Privacy />} />
  <Route path="/privacy-settings" element={<PrivacySettingsPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<PublicRegister />} />
        <Route path="/onboarding" element={<OnboardingAccept />} />
  {/* OAuth callback catcher; forwards code to backend and redirects back */}
  <Route path="/auth/:provider/callback" element={<AuthCallback />} />
        <Route
          path="/admin/onboarding"
          element={
            <ProtectedRoute>
              <AdminOnboarding />
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
  );
}