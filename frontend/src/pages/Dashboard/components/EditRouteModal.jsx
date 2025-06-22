import React, { useState, useEffect } from 'react';

const EditRouteModal = ({ isOpen, onClose, route, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    scenery_description: '',
    additional_notes: '',
    difficulty: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (route && isOpen) {
      setFormData({
        name: route.name || '',
        scenery_description: route.scenery_description || '',
        additional_notes: route.additional_notes || '',
        difficulty: route.difficulty || ''
      });
      setErrors({});
    }
  }, [route, isOpen]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Track name is required';
    } else if (formData.name.length > 255) {
      newErrors.name = 'Track name must be less than 255 characters';
    }
    
    if (formData.scenery_description.length > 1000) {
      newErrors.scenery_description = 'Description must be less than 1000 characters';
    }
    
    if (formData.additional_notes.length > 2000) {
      newErrors.additional_notes = 'Notes must be less than 2000 characters';
    }
    
    if (formData.difficulty && !['easy', 'moderate', 'hard', 'expert'].includes(formData.difficulty.toLowerCase())) {
      newErrors.difficulty = 'Please select a valid difficulty level';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const updateData = {
        name: formData.name.trim(),
        scenery_description: formData.scenery_description.trim(),
        additional_notes: formData.additional_notes.trim(),
        difficulty: formData.difficulty || null
      };

      await onSave(route.id, updateData);
      onClose();
    } catch (error) {
      console.error('Error updating route:', error);
      setErrors({ general: 'Failed to update track. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Edit Track</h3>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Track Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Track Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              disabled={isLoading}
              maxLength={255}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter track name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="scenery_description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="scenery_description"
              name="scenery_description"
              value={formData.scenery_description}
              onChange={handleInputChange}
              disabled={isLoading}
              maxLength={1000}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.scenery_description ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Describe the scenery or route features"
            />
            {errors.scenery_description && <p className="mt-1 text-sm text-red-600">{errors.scenery_description}</p>}
            <p className="mt-1 text-sm text-gray-500">{formData.scenery_description.length}/1000</p>
          </div>

          {/* Additional Notes */}
          <div>
            <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              id="additional_notes"
              name="additional_notes"
              value={formData.additional_notes}
              onChange={handleInputChange}
              disabled={isLoading}
              maxLength={2000}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.additional_notes ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Any additional notes about the track"
            />
            {errors.additional_notes && <p className="mt-1 text-sm text-red-600">{errors.additional_notes}</p>}
            <p className="mt-1 text-sm text-gray-500">{formData.additional_notes.length}/2000</p>
          </div>

          {/* Difficulty */}
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <select
              id="difficulty"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleInputChange}
              disabled={isLoading}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                errors.difficulty ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select difficulty</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
              <option value="expert">Expert</option>
            </select>
            {errors.difficulty && <p className="mt-1 text-sm text-red-600">{errors.difficulty}</p>}
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Technical data like distance, elevation, speed, and duration are automatically calculated from your GPX file and cannot be manually edited.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Saving...
                </div>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRouteModal;