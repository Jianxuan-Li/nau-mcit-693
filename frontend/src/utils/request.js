const BASE_URL = '/api/v1';

const getHeaders = (withAuth = true, isFormData = false) => {
  const headers = {};

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (withAuth) {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  
  return data;
};

const request = async (endpoint, options = {}) => {
  const { method = 'GET', body, withAuth = true, isFormData = false, timeout = 60000 } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: getHeaders(withAuth, isFormData),
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return handleResponse(response);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please try again with a smaller file');
    }
    throw error;
  }
};

export const userApi = {
  login: async (email, password) => {
    const data = await request('/users/login', {
      method: 'POST',
      body: { email, password },
      withAuth: false,
    });
    
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('userName', data.user.name);
    
    return data;
  },

  register: async (userData) => {
    return request('/users/register', {
      method: 'POST',
      body: userData,
      withAuth: false,
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userName');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Validate current token with backend
  validateToken: async () => {
    try {
      const data = await request('/auth/me');
      // Update user info in localStorage if token is valid
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('userName', data.user.name);
      return { valid: true, user: data.user };
    } catch (error) {
      // Token is invalid or expired, clear localStorage
      userApi.logout();
      return { valid: false, error: error.message };
    }
  },
};

export const routesApi = {
  create: async (file, routeData) => {
    const formData = new FormData();
    formData.append('gpx_file', file);
    formData.append('Name', routeData.name);
    formData.append('Description', routeData.description);
    formData.append('Difficulty', routeData.difficulty);
    formData.append('TotalDistance', routeData.totalDistance);
    formData.append('MaxElevationGain', routeData.maxElevationGain || 0);
    formData.append('EstimatedDuration', routeData.estimatedDuration || 60);
    
    return request('/routes/', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },
  
  getAll: async () => {
    return request('/routes/');
  },
  
  getById: async (id) => {
    return request(`/routes/${id}`);
  },
  
  update: async (id, routeData) => {
    return request(`/routes/${id}`, {
      method: 'PUT',
      body: routeData,
    });
  },
  
  delete: async (id) => {
    return request(`/routes/${id}`, {
      method: 'DELETE',
    });
  },

  // Get a presigned download URL for a route's GPX file
  getDownloadUrl: async (id) => {
    return request(`/download/routes/${id}`);
  },
};

export const publicRoutesApi = {
  getAll: async (queryParams = '') => {
    const endpoint = queryParams ? `/public/routes?${queryParams}` : '/public/routes';
    return request(endpoint, { withAuth: false });
  },

  getBySpatialExtent: async (bounds, options = {}) => {
    const { page = 1, limit = 50 } = options;
    const params = new URLSearchParams({
      min_lat: bounds.min_lat.toString(),
      max_lat: bounds.max_lat.toString(),
      min_lng: bounds.min_lng.toString(),
      max_lng: bounds.max_lng.toString(),
      page: page.toString(),
      limit: limit.toString()
    });
    
    return request(`/public/routes/spatial?${params.toString()}`, { withAuth: false });
  },

  // Get download URL for public access (for unregistered users)
  // Note: Uses shorter expiration time (1 minute) for security
  getDownloadUrl: async (routeId) => {
    return request(`/public/download/routes/${routeId}`, { 
      withAuth: false,
      timeout: 30000 // 30 second timeout for URL generation
    });
  },
};

export default request;
