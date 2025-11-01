import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import PublicRegister from './pages/PublicRegister';
import MasterAdminDashboard from './pages/MasterAdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<PublicRegister />} />
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
    </Router>
  );
}