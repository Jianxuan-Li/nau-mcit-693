import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import TrackBrowser from './pages/TrackBrowser';
import TrackUpload from './pages/TrackUpload';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/browse" element={<TrackBrowser />} />
          <Route path="/upload" element={<TrackUpload />} />
        </Routes>
      </main>
    </div>
  );
}

export default App; 