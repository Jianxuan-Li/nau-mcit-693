import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../utils/request';

export const useAuth = (redirectTo = '/login') => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const validateAuth = async () => {
      if (!userApi.isAuthenticated()) {
        navigate(redirectTo, { state: { from: window.location.pathname } });
        return;
      }

      try {
        const validation = await userApi.validateToken();
        if (validation.valid) {
          setIsAuthenticated(true);
          setUser(validation.user);
        } else {
          console.log('Token validation failed:', validation.error);
          navigate(redirectTo, { state: { from: window.location.pathname } });
        }
      } catch (error) {
        console.error('Auth validation error:', error);
        navigate(redirectTo, { state: { from: window.location.pathname } });
      } finally {
        setIsLoading(false);
      }
    };

    validateAuth();
  }, [navigate, redirectTo]);

  const logout = () => {
    userApi.logout();
    setIsAuthenticated(false);
    setUser(null);
    navigate('/login');
  };

  return {
    isAuthenticated,
    isLoading,
    user,
    logout
  };
};

export default useAuth;