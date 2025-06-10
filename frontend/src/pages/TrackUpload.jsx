import React from 'react';

function TrackUpload() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Upload Track
      </h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <div className="space-y-4">
            <div className="text-gray-600">
              <p className="text-lg">Drag and drop your GPX file here</p>
              <p className="text-sm mt-2">or</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors">
              Browse Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrackUpload; 