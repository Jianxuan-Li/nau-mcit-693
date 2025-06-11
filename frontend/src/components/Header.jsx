import React from 'react';
import { Link } from 'react-router-dom';

function Header() {
  // Mock user state - this will be replaced with actual auth state management
  const isAuthenticated = false;

  return (
    <header className="bg-green-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <nav className="flex items-center justify-between h-16">
          <Link 
            to="/" 
            className="text-xl font-bold hover:text-green-100 transition-colors"
          >
            Hiking Trails
          </Link>
          
          <div className="hidden md:flex space-x-6">
            <Link
              to="/browse"
              className="px-4 py-2 rounded hover:bg-green-500 transition-colors"
            >
              Browse Tracks
            </Link>
            <Link
              to="/upload"
              className="px-4 py-2 rounded hover:bg-green-500 transition-colors"
            >
              Upload Track
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="px-4 py-2 rounded hover:bg-green-500 transition-colors"
                >
                  Profile
                </Link>
                <button
                  className="px-4 py-2 bg-green-700 rounded hover:bg-green-800 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded hover:bg-green-500 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-green-700 rounded hover:bg-green-800 transition-colors"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header; 