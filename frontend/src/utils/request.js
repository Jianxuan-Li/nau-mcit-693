const BASE_URL = '/api/v1';

const getHeaders = (withAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };

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
  const { method = 'GET', body, withAuth = true } = options;
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: getHeaders(withAuth),
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleResponse(response);
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

export default request;
