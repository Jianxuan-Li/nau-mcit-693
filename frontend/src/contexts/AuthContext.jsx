import React, { createContext, useState, useContext, useEffect } from 'react';
import { userApi } from '../utils/request';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    try {
      const authStatus = userApi.isAuthenticated();
      const currentUser = userApi.getCurrentUser();
      setIsAuthenticated(authStatus);
      setUserName(currentUser?.name || '');
    } catch (error) {
      console.error('Error initializing auth state:', error);
      setIsAuthenticated(false);
      setUserName('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const data = await userApi.login(email, password);
    setIsAuthenticated(true);
    setUserName(data.user.name);
    return data;
  };

  const logout = () => {
    userApi.logout();
    setIsAuthenticated(false);
    setUserName('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, userName, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 