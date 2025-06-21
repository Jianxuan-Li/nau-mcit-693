import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import TrackBrowser from './pages/TrackBrowser';
import TrackUpload from './pages/TrackUpload';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import SettingsPage from './pages/SettingsPage';
import { AuthProvider } from './contexts/AuthContext';
import SpatialTrackBrowser from './pages/SpatialTrackBrowser';

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<TrackBrowser />} />
            <Route path="/upload" element={<TrackUpload />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/spatial-track-browser" element={<SpatialTrackBrowser />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App; 