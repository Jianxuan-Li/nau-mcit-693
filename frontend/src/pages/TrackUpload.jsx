import React, { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

mapboxgl.accessToken = 'XXXXX';

function TrackUpload() {
  const [currentStep, setCurrentStep] = useState(1);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [trackInfo, setTrackInfo] = useState({
    name: '',
    difficulty: 'easy',
    scenery: '',
    description: ''
  });
  const [previewData, setPreviewData] = useState(null);
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (currentStep === 3 && previewData && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [previewData.coordinates[0][1], previewData.coordinates[0][0]],
        zoom: 13
      });

      map.current.on('load', () => {
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: previewData.coordinates.map(coord => [coord[1], coord[0]])
            }
          }
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4
          }
        });
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [currentStep, previewData]);

  const handleFileDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      file => file.name.endsWith('.gpx')
    );
    setFiles(droppedFiles);
    // Simulate file processing
    simulateFileProcessing();
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      file => file.name.endsWith('.gpx')
    );
    setFiles(selectedFiles);
    // Simulate file processing
    simulateFileProcessing();
  };

  const simulateFileProcessing = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        // Simulate successful processing
        setPreviewData({
          coordinates: [[51.505, -0.09], [51.51, -0.1], [51.52, -0.12]],
          distance: '5.2 km',
          elevation: '+120m'
        });
      }
    }, 200);
  };

  const handleTrackInfoChange = (e) => {
    const { name, value } = e.target;
    setTrackInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const renderStepIndicator = () => (
    <div className="flex items-center mb-8">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center flex-1">
          {step > 1 && (
            <div className={`flex-1 h-1 ${
              currentStep > step - 1 ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            currentStep >= step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {step}
          </div>
          {step < 3 && (
            <div className={`flex-1 h-1 ${
              currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Step 1: Upload GPX Files</h2>
        <p className="mt-2 text-gray-600">Upload your GPX track files to get started</p>
      </div>
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleFileDrop}
      >
        <div className="space-y-4">
          <div className="text-gray-600">
            <p className="text-lg">Drag and drop your GPX files here</p>
            <p className="text-sm mt-2">or</p>
          </div>
          <input
            type="file"
            multiple
            accept=".gpx"
            onChange={handleFileSelect}
            className="hidden"
            id="fileInput"
          />
          <label
            htmlFor="fileInput"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors cursor-pointer inline-block"
          >
            Browse Files
          </label>
          <p className="text-sm text-gray-500 mt-4">
            Supported format: GPX files only<br />
            Maximum file size: 10MB per file
          </p>
        </div>
      </div>
      {files.length > 0 && (
        <div className="mt-6">
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-600">{file.name}</span>
                <span className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Step 2: Track Information</h2>
        <p className="mt-2 text-gray-600">Add details about your track</p>
      </div>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Track Name</label>
          <input
            type="text"
            name="name"
            value={trackInfo.name}
            onChange={handleTrackInfoChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Difficulty Level</label>
          <select
            name="difficulty"
            value={trackInfo.difficulty}
            onChange={handleTrackInfoChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="easy">Easy</option>
            <option value="moderate">Moderate</option>
            <option value="challenging">Challenging</option>
            <option value="difficult">Difficult</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Scenery Description</label>
          <textarea
            name="scenery"
            value={trackInfo.scenery}
            onChange={handleTrackInfoChange}
            rows="3"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Additional Description</label>
          <textarea
            name="description"
            value={trackInfo.description}
            onChange={handleTrackInfoChange}
            rows="4"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Step 3: Preview & Confirm</h2>
        <p className="mt-2 text-gray-600">Review your track details before submitting</p>
      </div>
      <div className="space-y-6">
        <div className="h-64 rounded-lg overflow-hidden">
          <div ref={mapContainer} className="h-full w-full" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-500">Distance</p>
            <p className="text-lg font-semibold">{previewData?.distance}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-500">Elevation</p>
            <p className="text-lg font-semibold">{previewData?.elevation}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded">
            <p className="text-sm text-gray-500">Files</p>
            <p className="text-lg font-semibold">{files.length}</p>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Track Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{trackInfo.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Difficulty</p>
              <p className="font-medium capitalize">{trackInfo.difficulty}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Upload Track
      </h1>
      {renderStepIndicator()}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      <div className="mt-8 flex justify-between">
        {currentStep > 1 && (
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
          >
            Previous
          </button>
        )}
        {currentStep < 3 ? (
          <button
            onClick={() => setCurrentStep(prev => prev + 1)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 ml-auto"
          >
            Next
          </button>
        ) : (
          <button
            onClick={() => console.log('Submit track')}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 ml-auto"
          >
            Submit Track
          </button>
        )}
      </div>
    </div>
  );
}

export default TrackUpload; 