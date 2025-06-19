import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';

const TrackBrowserContext = createContext();

// Action types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_TRACKS: 'SET_TRACKS',
  SET_SELECTED_TRACK: 'SET_SELECTED_TRACK',
  SET_SEARCH_TERM: 'SET_SEARCH_TERM',
  SET_DIFFICULTY_FILTER: 'SET_DIFFICULTY_FILTER',
  SET_CURRENT_PAGE: 'SET_CURRENT_PAGE',
  SET_TOTAL_PAGES: 'SET_TOTAL_PAGES',
  SET_MAP_INSTANCE: 'SET_MAP_INSTANCE',
  
  // GPX loading actions
  ADD_LOADED_GPX: 'ADD_LOADED_GPX',
  ADD_LOADING_GPX: 'ADD_LOADING_GPX',
  REMOVE_LOADING_GPX: 'REMOVE_LOADING_GPX',
  ADD_GPX_ERROR: 'ADD_GPX_ERROR',
  REMOVE_GPX_ERROR: 'REMOVE_GPX_ERROR',
  CLEAR_GPX_DATA: 'CLEAR_GPX_DATA',
  
  // Window size
  SET_WINDOW_SIZE: 'SET_WINDOW_SIZE',
};

// Initial state
const initialState = {
  // Track data
  tracks: [],
  selectedTrack: null,
  
  // Search and filtering
  searchTerm: '',
  difficultyFilter: '',
  
  // Pagination
  currentPage: 1,
  totalPages: 1,
  limit: 10,
  
  // GPX data
  loadedGpxData: new Map(),
  loadingGpx: new Set(),
  gpxErrors: new Map(),
  
  // Map
  mapInstance: null,
  
  // UI state
  loading: true,
  error: null,
  windowSize: {
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  },
};

// Reducer
function trackBrowserReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
      
    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
      
    case ACTIONS.SET_TRACKS:
      return { ...state, tracks: action.payload, loading: false };
      
    case ACTIONS.SET_SELECTED_TRACK:
      return { ...state, selectedTrack: action.payload };
      
    case ACTIONS.SET_SEARCH_TERM:
      return { ...state, searchTerm: action.payload, currentPage: 1 };
      
    case ACTIONS.SET_DIFFICULTY_FILTER:
      return { ...state, difficultyFilter: action.payload, currentPage: 1 };
      
    case ACTIONS.SET_CURRENT_PAGE:
      return { ...state, currentPage: action.payload };
      
    case ACTIONS.SET_TOTAL_PAGES:
      return { ...state, totalPages: action.payload };
      
    case ACTIONS.SET_MAP_INSTANCE:
      return { ...state, mapInstance: action.payload };
      
    case ACTIONS.ADD_LOADED_GPX: {
      const newLoadedGpxData = new Map(state.loadedGpxData);
      newLoadedGpxData.set(action.payload.routeId, action.payload.data);
      return { ...state, loadedGpxData: newLoadedGpxData };
    }
    
    case ACTIONS.ADD_LOADING_GPX: {
      const newLoadingGpx = new Set(state.loadingGpx);
      newLoadingGpx.add(action.payload);
      return { ...state, loadingGpx: newLoadingGpx };
    }
    
    case ACTIONS.REMOVE_LOADING_GPX: {
      const newLoadingGpx = new Set(state.loadingGpx);
      newLoadingGpx.delete(action.payload);
      return { ...state, loadingGpx: newLoadingGpx };
    }
    
    case ACTIONS.ADD_GPX_ERROR: {
      const newGpxErrors = new Map(state.gpxErrors);
      newGpxErrors.set(action.payload.routeId, action.payload.error);
      return { ...state, gpxErrors: newGpxErrors };
    }
    
    case ACTIONS.REMOVE_GPX_ERROR: {
      const newGpxErrors = new Map(state.gpxErrors);
      newGpxErrors.delete(action.payload);
      return { ...state, gpxErrors: newGpxErrors };
    }
    
    case ACTIONS.CLEAR_GPX_DATA:
      return {
        ...state,
        loadedGpxData: new Map(),
        loadingGpx: new Set(),
        gpxErrors: new Map()
      };
      
    case ACTIONS.SET_WINDOW_SIZE:
      return { ...state, windowSize: action.payload };
      
    default:
      return state;
  }
}

// Provider component
export function TrackBrowserProvider({ children }) {
  const [state, dispatch] = useReducer(trackBrowserReducer, initialState);
  
  // Action creators
  const actions = useMemo(() => ({
    setLoading: (loading) => {
      dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
    },
    
    setError: (error) => {
      dispatch({ type: ACTIONS.SET_ERROR, payload: error });
    },
    
    setTracks: (tracks) => {
      dispatch({ type: ACTIONS.SET_TRACKS, payload: tracks });
    },
    
    setSelectedTrack: (track) => {
      dispatch({ type: ACTIONS.SET_SELECTED_TRACK, payload: track });
    },
    
    setSearchTerm: (term) => {
      dispatch({ type: ACTIONS.SET_SEARCH_TERM, payload: term });
    },
    
    setDifficultyFilter: (filter) => {
      dispatch({ type: ACTIONS.SET_DIFFICULTY_FILTER, payload: filter });
    },
    
    setCurrentPage: (page) => {
      dispatch({ type: ACTIONS.SET_CURRENT_PAGE, payload: page });
    },
    
    setTotalPages: (pages) => {
      dispatch({ type: ACTIONS.SET_TOTAL_PAGES, payload: pages });
    },
    
    setMapInstance: (mapInstance) => {
      dispatch({ type: ACTIONS.SET_MAP_INSTANCE, payload: mapInstance });
    },
    
    // GPX actions
    addLoadedGpx: (routeId, data) => {
      dispatch({ type: ACTIONS.ADD_LOADED_GPX, payload: { routeId, data } });
    },
    
    addLoadingGpx: (routeId) => {
      dispatch({ type: ACTIONS.ADD_LOADING_GPX, payload: routeId });
    },
    
    removeLoadingGpx: (routeId) => {
      dispatch({ type: ACTIONS.REMOVE_LOADING_GPX, payload: routeId });
    },
    
    addGpxError: (routeId, error) => {
      dispatch({ type: ACTIONS.ADD_GPX_ERROR, payload: { routeId, error } });
    },
    
    removeGpxError: (routeId) => {
      dispatch({ type: ACTIONS.REMOVE_GPX_ERROR, payload: routeId });
    },
    
    clearGpxData: () => {
      dispatch({ type: ACTIONS.CLEAR_GPX_DATA });
    },
    
    setWindowSize: (size) => {
      dispatch({ type: ACTIONS.SET_WINDOW_SIZE, payload: size });
    },
    
    // Utility actions
    clearFilters: () => {
      dispatch({ type: ACTIONS.SET_SEARCH_TERM, payload: '' });
      dispatch({ type: ACTIONS.SET_DIFFICULTY_FILTER, payload: '' });
      dispatch({ type: ACTIONS.SET_CURRENT_PAGE, payload: 1 });
    },
  }), []);
  
  const value = useMemo(() => ({
    ...state,
    actions,
  }), [state, actions]);
  
  return (
    <TrackBrowserContext.Provider value={value}>
      {children}
    </TrackBrowserContext.Provider>
  );
}

// Hook to use the context
export function useTrackBrowser() {
  const context = useContext(TrackBrowserContext);
  if (!context) {
    throw new Error('useTrackBrowser must be used within a TrackBrowserProvider');
  }
  return context;
}

export default TrackBrowserContext;