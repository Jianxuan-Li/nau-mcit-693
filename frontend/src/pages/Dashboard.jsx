import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { routesApi } from '../utils/request';
import { useAuth } from '../contexts/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';

function Dashboard() {
  const navigate = useNavigate();
  const { isAuthenticated, userName } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, routeId: null, routeName: '' });
  const [modal, setModal] = useState({ isOpen: false, type: 'info', title: '', message: '' });
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchRoutes();
  }, [isAuthenticated, navigate]);

  const fetchRoutes = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await routesApi.getAll();
      setRoutes(response.routes || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
      setError('Failed to load your tracks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (routeId, routeName) => {
    setConfirmModal({
      isOpen: true,
      routeId,
      routeName
    });
  };

  const handleDeleteConfirm = async () => {
    const { routeId } = confirmModal;
    try {
      setDeletingId(routeId);
      await routesApi.delete(routeId);
      setRoutes(prev => prev.filter(route => route.id !== routeId));
      setModal({
        isOpen: true,
        type: 'success',
        title: 'Track Deleted',
        message: 'The track has been successfully deleted.'
      });
    } catch (error) {
      console.error('Error deleting route:', error);
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Delete Failed',
        message: 'Failed to delete the track. Please try again.'
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadClick = async (routeId, routeName) => {
    setDownloadingId(routeId);
    try {
      const response = await routesApi.getDownloadUrl(routeId);
      const url = response.download_url;
      if (!url) throw new Error('No download URL received');
      // Create a temporary link to trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${routeName || 'track'}.gpx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      setModal({
        isOpen: true,
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to download the track. Please try again.'
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const formatDistance = (distance) => {
    if (!distance) return 'N/A';
    return `${distance} km`;
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'moderate':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-orange-100 text-orange-800';
      case 'expert':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your tracks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Welcome back, {userName}! Manage your uploaded GPS tracks below.
          </p>
        </div>

        {/* Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/upload')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
            >
              Upload New Track
            </button>
            <button
              onClick={fetchRoutes}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Refresh
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Total tracks: {routes.length}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Routes List */}
        {routes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tracks uploaded yet</h3>
            <p className="text-gray-500 mb-6">Start by uploading your first GPS track to see it here.</p>
            <button
              onClick={() => navigate('/upload')}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
            >
              Upload Your First Track
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Track Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Difficulty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Distance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {routes.map((route) => (
                    <tr key={route.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {route.name || 'Untitled Track'}
                          </div>
                          {route.scenery_description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {route.scenery_description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(route.difficulty)}`}>
                          {route.difficulty || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDistance(route.total_distance)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDuration(route.estimated_duration)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(route.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDownloadClick(route.id, route.name)}
                          disabled={downloadingId === route.id}
                          className={`text-blue-600 hover:text-blue-900 transition-colors mr-4 ${downloadingId === route.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Download track"
                        >
                          {downloadingId === route.id ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-1"></div>
                              Downloading...
                            </div>
                          ) : (
                            'Download'
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteClick(route.id, route.name)}
                          disabled={deletingId === route.id}
                          className={`text-red-600 hover:text-red-900 transition-colors ${
                            deletingId === route.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Delete track"
                        >
                          {deletingId === route.id ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-600 mr-1"></div>
                              Deleting...
                            </div>
                          ) : (
                            'Delete'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, routeId: null, routeName: '' })}
          onConfirm={handleDeleteConfirm}
          title="Delete Track"
          message={`Are you sure you want to delete "${confirmModal.routeName}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />

        <Modal
          isOpen={modal.isOpen}
          onClose={() => setModal({ ...modal, isOpen: false })}
          type={modal.type}
          title={modal.title}
        >
          {modal.message}
        </Modal>
      </div>
    </div>
  );
}

export default Dashboard;