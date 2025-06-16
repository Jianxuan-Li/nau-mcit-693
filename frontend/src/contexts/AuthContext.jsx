import React, { createContext, useState, useContext, useEffect } from 'react';
import { userApi } from '../utils/request';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Initialize auth state
    setIsAuthenticated(userApi.isAuthenticated());
    setUserName(userApi.getCurrentUser()?.name || '');
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

  return (
    <AuthContext.Provider value={{ isAuthenticated, userName, login, logout }}>
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