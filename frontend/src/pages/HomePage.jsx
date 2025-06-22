import React from 'react';
import { Link } from 'react-router-dom';

function HomePage() {
  // Mock data for popular tracks
  const popularTracks = [
    {
      id: 1,
      title: "Mountain Trail Adventure",
      distance: "5.2 km",
      elevation: "320m",
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1551632811-561732d1e306?ixlib=rb-4.0.3"
    },
    {
      id: 2,
      title: "Coastal Path Explorer",
      distance: "8.7 km",
      elevation: "150m",
      rating: 4.6,
      image: "https://images.unsplash.com/photo-1501554728187-ce583db33af7?ixlib=rb-4.0.3"
    },
    {
      id: 3,
      title: "Forest Loop Trail",
      distance: "3.5 km",
      elevation: "180m",
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-green-800 mb-6">
              Discover and Share Your Hiking Adventures
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore curated hiking trails, upload your own tracks, and connect with fellow outdoor enthusiasts.
              Start your journey today!
            </p>
          </div>
          <div className="flex justify-center gap-6">
            <a
              href="/browse"
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Browse Tracks
            </a>
            <Link
              to="/upload"
              className="px-8 py-3 bg-white text-green-600 border-2 border-green-600 rounded-lg hover:bg-green-50 transition-colors"
            >
              Upload Track
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Why Choose Our Platform?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Exploration</h3>
              <p className="text-gray-600">Discover carefully curated hiking trails with detailed information and user reviews.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Upload</h3>
              <p className="text-gray-600">Share your hiking experiences by uploading GPX tracks with photos and descriptions.</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Community</h3>
              <p className="text-gray-600">Connect with fellow hikers, share experiences, and discover new trails together.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Tracks Section */}
      <section className="py-16 bg-green-50">
        <div className="container mx-auto max-w-6xl px-4">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">
            Popular Tracks
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {popularTracks.map((track) => (
              <div key={track.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <img
                  src={track.image}
                  alt={track.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{track.title}</h3>
                  <div className="flex justify-between text-gray-600 mb-4">
                    <span>{track.distance}</span>
                    <span>{track.elevation} elevation</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-yellow-400">★</span>
                    <span className="ml-1 text-gray-600">{track.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <a
              href="/browse"
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              View All Tracks
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage; 