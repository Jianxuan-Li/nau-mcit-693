import React, { useState, useRef, useEffect, useCallback } from 'react';

const GPXTimeline = ({ 
  gpxData, 
  editMode, 
  selection, 
  selectedSegments, 
  onSelectionChange, 
  onSegmentSelection 
}) => {
  const timelineRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState(null); // 'start', 'end', or null
  const [timelineWidth, setTimelineWidth] = useState(0);

  // Update timeline width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Generate timeline data from GPX
  const generateTimelineData = useCallback(() => {
    if (!gpxData || !gpxData.tracks) return [];

    const segments = [];
    let totalPoints = 0;
    let globalIndex = 0;

    // First pass: count total points and create segment structure
    gpxData.tracks.forEach((track, trackIndex) => {
      track.segments.forEach((segment, segmentIndex) => {
        const segmentData = {
          trackIndex,
          segmentIndex,
          trackName: track.name || `Track ${trackIndex + 1}`,
          pointCount: segment.points.length,
          startIndex: globalIndex,
          endIndex: globalIndex + segment.points.length - 1,
          points: segment.points
        };

        segments.push(segmentData);
        totalPoints += segment.points.length;
        globalIndex += segment.points.length;
      });
    });

    // Calculate percentages for positioning
    segments.forEach(segment => {
      segment.startPercent = (segment.startIndex / totalPoints) * 100;
      segment.endPercent = ((segment.endIndex + 1) / totalPoints) * 100;
      segment.widthPercent = segment.endPercent - segment.startPercent;
    });

    return { segments, totalPoints };
  }, [gpxData]);

  const timelineData = generateTimelineData();

  // Convert pixel position to percentage
  const pixelToPercent = (pixel) => {
    if (!timelineWidth) return 0;
    return Math.max(0, Math.min(100, (pixel / timelineWidth) * 100));
  };

  // Handle mouse down on timeline
  const handleMouseDown = (event, handle = null) => {
    event.preventDefault();
    setIsDragging(true);
    setDragHandle(handle);

    if (!handle && editMode === 'split') {
      // Click on timeline in split mode - toggle segment selection
      const rect = timelineRef.current.getBoundingClientRect();
      const clickPercent = pixelToPercent(event.clientX - rect.left);
      
      // Find which segment was clicked
      const clickedSegment = timelineData.segments.find(segment =>
        clickPercent >= segment.startPercent && clickPercent <= segment.endPercent
      );

      if (clickedSegment) {
        const segmentId = `${clickedSegment.trackIndex}-${clickedSegment.segmentIndex}`;
        const isSelected = selectedSegments.includes(segmentId);
        
        let newSelection;
        if (isSelected) {
          newSelection = selectedSegments.filter(id => id !== segmentId);
        } else {
          newSelection = [...selectedSegments, segmentId];
        }
        
        onSegmentSelection(newSelection);
      }
    }
  };

  // Handle mouse move
  const handleMouseMove = useCallback((event) => {
    if (!isDragging || !timelineRef.current || editMode !== 'trim') return;

    const rect = timelineRef.current.getBoundingClientRect();
    const percent = pixelToPercent(event.clientX - rect.left);

    let newSelection = { ...selection };
    
    if (dragHandle === 'start') {
      newSelection.start = Math.min(percent, selection.end - 1);
    } else if (dragHandle === 'end') {
      newSelection.end = Math.max(percent, selection.start + 1);
    } else if (dragHandle === null) {
      // Dragging the entire selection
      const selectionWidth = selection.end - selection.start;
      const newStart = Math.max(0, Math.min(100 - selectionWidth, percent - selectionWidth / 2));
      newSelection = {
        start: newStart,
        end: newStart + selectionWidth
      };
    }

    onSelectionChange(newSelection);
  }, [isDragging, dragHandle, selection, editMode, onSelectionChange, pixelToPercent]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragHandle(null);
  }, []);

  // Add/remove global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  if (!gpxData || timelineData.segments.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <p>No timeline data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <h4 className="text-sm font-medium text-gray-700 mb-3">
        Timeline {editMode === 'trim' ? '(Drag to select range)' : '(Click segments to select)'}
      </h4>
      
      {/* Timeline Container */}
      <div className="flex-1 flex flex-col justify-center">
        
        {/* Timeline Track */}
        <div
          ref={timelineRef}
          className="relative h-16 bg-gray-200 rounded-lg cursor-pointer select-none"
          onMouseDown={(e) => handleMouseDown(e)}
        >
          {/* Segments */}
          {timelineData.segments.map((segment, index) => {
            const segmentId = `${segment.trackIndex}-${segment.segmentIndex}`;
            const isSelected = selectedSegments.includes(segmentId);
            
            return (
              <div
                key={segmentId}
                className={`absolute top-1 bottom-1 rounded transition-colors ${
                  editMode === 'split' && isSelected
                    ? 'bg-red-500 border-2 border-red-700'
                    : 'bg-blue-500 border border-blue-600'
                } hover:bg-blue-600`}
                style={{
                  left: `${segment.startPercent}%`,
                  width: `${segment.widthPercent}%`
                }}
                title={`${segment.trackName} - Segment ${segment.segmentIndex + 1} (${segment.pointCount} points)`}
              />
            );
          })}

          {/* Trim Selection Overlay (only in trim mode) */}
          {editMode === 'trim' && (
            <>
              {/* Left excluded area */}
              {selection.start > 0 && (
                <div
                  className="absolute top-0 bottom-0 bg-gray-500 bg-opacity-50 rounded-l-lg"
                  style={{
                    left: 0,
                    width: `${selection.start}%`
                  }}
                />
              )}

              {/* Right excluded area */}
              {selection.end < 100 && (
                <div
                  className="absolute top-0 bottom-0 bg-gray-500 bg-opacity-50 rounded-r-lg"
                  style={{
                    left: `${selection.end}%`,
                    width: `${100 - selection.end}%`
                  }}
                />
              )}

              {/* Selection handles */}
              <div
                className="absolute top-0 bottom-0 w-2 bg-green-500 cursor-ew-resize hover:bg-green-600 rounded-l"
                style={{ left: `${selection.start}%`, marginLeft: '-4px' }}
                onMouseDown={(e) => handleMouseDown(e, 'start')}
              />
              <div
                className="absolute top-0 bottom-0 w-2 bg-green-500 cursor-ew-resize hover:bg-green-600 rounded-r"
                style={{ left: `${selection.end}%`, marginLeft: '-4px' }}
                onMouseDown={(e) => handleMouseDown(e, 'end')}
              />

              {/* Selection area */}
              <div
                className="absolute top-2 bottom-2 border-2 border-green-500 rounded cursor-move"
                style={{
                  left: `${selection.start}%`,
                  width: `${selection.end - selection.start}%`
                }}
                onMouseDown={(e) => handleMouseDown(e)}
              />
            </>
          )}
        </div>

        {/* Timeline Labels */}
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>Start</span>
          {editMode === 'trim' && (
            <span className="text-green-600 font-medium">
              {selection.start.toFixed(1)}% - {selection.end.toFixed(1)}%
            </span>
          )}
          <span>End</span>
        </div>

        {/* Segments Info */}
        <div className="mt-4 text-xs text-gray-600">
          <div className="flex items-center justify-between">
            <span>{timelineData.segments.length} segments, {timelineData.totalPoints.toLocaleString()} points</span>
            {editMode === 'split' && selectedSegments.length > 0 && (
              <span className="text-red-600 font-medium">
                {selectedSegments.length} segment{selectedSegments.length !== 1 ? 's' : ''} selected
              </span>
            )}
          </div>
        </div>

        {/* Segment List (for split mode) */}
        {editMode === 'split' && (
          <div className="mt-4 max-h-32 overflow-y-auto">
            <div className="text-xs font-medium text-gray-700 mb-2">Segments:</div>
            <div className="space-y-1">
              {timelineData.segments.map((segment) => {
                const segmentId = `${segment.trackIndex}-${segment.segmentIndex}`;
                const isSelected = selectedSegments.includes(segmentId);
                
                return (
                  <div
                    key={segmentId}
                    className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-red-100 border border-red-300 text-red-800' 
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                    onClick={() => {
                      const newSelection = isSelected
                        ? selectedSegments.filter(id => id !== segmentId)
                        : [...selectedSegments, segmentId];
                      onSegmentSelection(newSelection);
                    }}
                  >
                    <div>
                      <div className="font-medium">{segment.trackName}</div>
                      <div className="text-gray-500">Segment {segment.segmentIndex + 1}</div>
                    </div>
                    <div className="text-right">
                      <div>{segment.pointCount} points</div>
                      <div className="text-gray-500">
                        {segment.startPercent.toFixed(1)}% - {segment.endPercent.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GPXTimeline;