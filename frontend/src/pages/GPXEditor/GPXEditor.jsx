import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import GPXMapComponent from './components/GPXMapComponent';
import GPXUploader from './components/GPXUploader';
import GPXTimeline from './components/GPXTimeline';
import GPXInfo from './components/GPXInfo';
import { 
  loadGPXToMap,
  clearGPXFromMap,
  getGPXBounds,
  animateToGPX
} from './MapInstance';
import { 
  trimGPXData, 
  removeSegmentsFromGPX, 
  downloadGPX, 
  validateGPXData 
} from './utils/gpxUtils';

const GPXEditor = () => {
  const { isAuthenticated } = useAuth();
  const [gpxData, setGpxData] = useState(null);
  const [gpxFile, setGpxFile] = useState(null);
  const [selectedSegments, setSelectedSegments] = useState([]);
  const [timelineSelection, setTimelineSelection] = useState({ start: 0, end: 100 });
  const [editMode, setEditMode] = useState('trim'); // 'trim' or 'split'

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isAuthenticated]);

  // Handle GPX file upload
  const handleGPXUpload = async (file, parsedData) => {
    try {
      setGpxFile(file);
      setGpxData(parsedData);
      
      // Load GPX to map
      await loadGPXToMap(parsedData);
      
      // Animate map to fit GPX bounds
      const bounds = getGPXBounds(parsedData);
      if (bounds) {
        animateToGPX(bounds);
      }
      
      console.log('GPX loaded successfully:', parsedData);
    } catch (error) {
      console.error('Error loading GPX:', error);
    }
  };

  // Handle GPX clear
  const handleGPXClear = () => {
    setGpxData(null);
    setGpxFile(null);
    setSelectedSegments([]);
    setTimelineSelection({ start: 0, end: 100 });
    clearGPXFromMap();
  };

  // Handle timeline selection change
  const handleTimelineSelectionChange = (selection) => {
    setTimelineSelection(selection);
    // TODO: Update map visualization to show selected portion
  };

  // Handle segment selection for split mode
  const handleSegmentSelection = (segments) => {
    setSelectedSegments(segments);
    // TODO: Update map visualization to highlight selected segments
  };

  // Apply trim operation
  const handleTrim = async () => {
    if (!gpxData) return;
    
    try {
      // Validate selection
      if (timelineSelection.start >= timelineSelection.end) {
        alert('Invalid selection range');
        return;
      }
      
      // Apply trim
      const trimmedData = trimGPXData(gpxData, timelineSelection.start, timelineSelection.end);
      
      // Validate the result
      const errors = validateGPXData(trimmedData);
      if (errors.length > 0) {
        alert('Trim operation resulted in invalid GPX data: ' + errors.join(', '));
        return;
      }
      
      // Update state
      setGpxData(trimmedData);
      
      // Update map
      await loadGPXToMap(trimmedData);
      
      // Reset timeline selection
      setTimelineSelection({ start: 0, end: 100 });
      
      console.log('GPX trimmed successfully');
    } catch (error) {
      console.error('Error trimming GPX:', error);
      alert('Failed to trim GPX: ' + error.message);
    }
  };

  // Apply split and delete operation
  const handleSplitDelete = async () => {
    if (!gpxData || selectedSegments.length === 0) return;
    
    try {
      // Apply segment removal
      const editedData = removeSegmentsFromGPX(gpxData, selectedSegments);
      
      // Validate the result
      const errors = validateGPXData(editedData);
      if (errors.length > 0) {
        alert('Delete operation resulted in invalid GPX data: ' + errors.join(', '));
        return;
      }
      
      // Update state
      setGpxData(editedData);
      setSelectedSegments([]);
      
      // Update map
      await loadGPXToMap(editedData);
      
      console.log('GPX segments deleted successfully');
    } catch (error) {
      console.error('Error deleting segments:', error);
      alert('Failed to delete segments: ' + error.message);
    }
  };

  // Download edited GPX
  const handleDownload = () => {
    if (!gpxData || !gpxFile) return;
    
    try {
      // Generate filename
      const originalName = gpxFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `${originalName}_edited_${timestamp}.gpx`;
      
      // Download the file
      downloadGPX(gpxData, filename);
      
      console.log('GPX downloaded successfully:', filename);
    } catch (error) {
      console.error('Error downloading GPX:', error);
      alert('Failed to download GPX: ' + error.message);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: 'calc(100vh - 64px)' }}
    >
      {/* Main content area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-6 gap-6">
        
        {/* Map takes 60% width on desktop */}
        <div className="flex-1 md:w-3/5 bg-white rounded-lg shadow">
          <GPXMapComponent 
            className="w-full h-full" 
            gpxData={gpxData}
            selectedSegments={selectedSegments}
            timelineSelection={timelineSelection}
          />
        </div>

        {/* Right panel takes 40% width on desktop */}
        <div className="flex-1 md:w-2/5 flex flex-col gap-4">
          
          {/* GPX Upload Section */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <GPXUploader 
              onGPXUpload={handleGPXUpload}
              onGPXClear={handleGPXClear}
              hasGPX={!!gpxData}
              fileName={gpxFile?.name}
            />
          </div>

          {/* GPX Info Section */}
          {gpxData && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
              <GPXInfo gpxData={gpxData} />
            </div>
          )}

          {/* Timeline and Edit Controls */}
          {gpxData && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex-1 overflow-hidden">
              <div className="h-full flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-3">Edit Track</h3>
                  
                  {/* Edit Mode Toggle */}
                  <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setEditMode('trim')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        editMode === 'trim'
                          ? 'bg-white text-gray-900 shadow'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Trim
                    </button>
                    <button
                      onClick={() => setEditMode('split')}
                      className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        editMode === 'split'
                          ? 'bg-white text-gray-900 shadow'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Split & Delete
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mb-4">
                    {editMode === 'trim' ? (
                      <button
                        onClick={handleTrim}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Apply Trim
                      </button>
                    ) : (
                      <button
                        onClick={handleSplitDelete}
                        disabled={selectedSegments.length === 0}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        Delete Selected
                      </button>
                    )}
                    <button
                      onClick={handleDownload}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Download GPX
                    </button>
                  </div>
                </div>

                {/* Timeline Component */}
                <div className="flex-1 overflow-hidden">
                  <GPXTimeline
                    gpxData={gpxData}
                    editMode={editMode}
                    selection={timelineSelection}
                    selectedSegments={selectedSegments}
                    onSelectionChange={handleTimelineSelectionChange}
                    onSegmentSelection={handleSegmentSelection}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GPXEditor;