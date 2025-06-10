import React from 'react';

function TrackBrowser() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Track Browser
      </h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map component will be added here */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
          <div className="h-[600px] bg-gray-100 rounded">
            Map will be displayed here
          </div>
        </div>
        {/* Track list component will be added here */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-xl font-semibold mb-4">Track List</h2>
          <div className="space-y-4">
            {/* Track items will be listed here */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrackBrowser; 