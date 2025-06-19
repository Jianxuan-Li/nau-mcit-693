import React from 'react';
import { useTrackBrowser } from '../context/TrackBrowserContext';

const SearchFilters = ({ className = '' }) => {
  const { searchTerm, difficultyFilter, actions } = useTrackBrowser();

  const handleSearchChange = (e) => {
    actions.setSearchTerm(e.target.value);
  };

  const handleDifficultyChange = (e) => {
    actions.setDifficultyFilter(e.target.value);
  };

  const handleClearFilters = () => {
    actions.clearFilters();
  };

  const hasActiveFilters = searchTerm || difficultyFilter;

  return (
    <div className={`flex flex-wrap gap-4 ${className}`}>
      {/* Search Input */}
      <div className="flex-1 min-w-64">
        <div className="relative">
          <input
            type="text"
            placeholder="Search tracks..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button
              onClick={() => actions.setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Difficulty Filter */}
      <div className="relative">
        <select
          value={difficultyFilter}
          onChange={handleDifficultyChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 appearance-none bg-white pr-8"
        >
          <option value="">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="hard">Hard</option>
          <option value="expert">Expert</option>
        </select>
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      
      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <button
          onClick={handleClearFilters}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Clear Filters
        </button>
      )}
      
      {/* Active Filters Indicator */}
      {hasActiveFilters && (
        <div className="flex items-center text-sm text-gray-600">
          <span className="mr-2">Active filters:</span>
          {searchTerm && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 mr-2">
              &quot;{searchTerm}&quot;
              <button
                onClick={() => actions.setSearchTerm('')}
                className="ml-1 hover:text-blue-600"
              >
                ×
              </button>
            </span>
          )}
          {difficultyFilter && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              {difficultyFilter}
              <button
                onClick={() => actions.setDifficultyFilter('')}
                className="ml-1 hover:text-green-600"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilters;