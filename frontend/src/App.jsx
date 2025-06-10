import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TrackBrowser from './pages/TrackBrowser';
import TrackUpload from './pages/TrackUpload';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<TrackBrowser />} />
          <Route path="/upload" element={<TrackUpload />} />
        </Routes>
      </main>
    </div>
  );
}

export default App; 