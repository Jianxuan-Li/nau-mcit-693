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
};

export const gpxApi = {
  upload: async (file, description = '') => {
    const formData = new FormData();
    formData.append('gpx_file', file);
    formData.append('description', description);
    
    console.log('DEBUG: Uploading file:', file.name, 'Size:', file.size, 'bytes');
    console.log('DEBUG: FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }
    
    return request('/gpx/upload', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  },
};

export const trailsApi = {
  create: async (trailData) => {
    return request('/trails', {
      method: 'POST',
      body: trailData,
    });
  },
};

export default request;
