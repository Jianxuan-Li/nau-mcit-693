import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          <Link 
            to="/" 
            className="text-xl font-bold hover:text-blue-100 transition-colors"
          >
            GPX Track Viewer
          </Link>
          <div className="space-x-4">
            <Link
              to="/"
              className="px-4 py-2 rounded hover:bg-blue-500 transition-colors"
            >
              Browse Tracks
            </Link>
            <Link
              to="/upload"
              className="px-4 py-2 rounded hover:bg-blue-500 transition-colors"
            >
              Upload Track
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header; 