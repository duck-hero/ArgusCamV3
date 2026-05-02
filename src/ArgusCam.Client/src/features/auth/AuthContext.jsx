import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { storage } from '../../utils/storage';
import { isTokenExpired } from '../../utils/jwt';
import { ROLES } from '../../constants/roles';
import { API_BASE_URL } from '../../constants/api';

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_LOADING: 'SET_LOADING',
};

// Reducer function
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Kiểm tra authentication status khi component mount
  useEffect(() => {
    const initAuth = () => {
      const token = storage.getToken();
      const user = storage.getUser();

      const refreshToken = storage.getRefreshToken();
      const accessExpired = token ? isTokenExpired(token) : true;
      const canStayLoggedIn = token && user && (!accessExpired || refreshToken);

      if (canStayLoggedIn) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user, token },
        });
      } else {
        if (token || user) {
          storage.clearAuth();
        }
        dispatch({
          type: AUTH_ACTIONS.SET_LOADING,
          payload: false,
        });
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      // Sẽ được implement trong auth service
      const response = await fetch(`${API_BASE_URL}/Account/Login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();

      // Kiểm tra lỗi từ API
      if (data.err) {
        throw new Error(data.err);
      }

      const { token, refreshToken, ...userInfo } = data.content;

      // Construct user object from content
      const user = {
        id: userInfo.userId,
        fullName: userInfo.fullName,
        roles: userInfo.roles,
        role: userInfo.roles[0], // Giữ tương thích ngược nếu cần
        ...userInfo
      };

      // Lưu vào storage
      storage.setToken(token);
      storage.setRefreshToken(refreshToken);
      storage.setUser(user);

      // Update state
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: {
          user: user,
          token: token,
        },
      });

      return data;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: error.message || 'Login failed',
      });
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    storage.clearAuth();
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  };

  // Check user role
  const hasRole = (role) => {
    return state.user?.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return hasRole(ROLES.ADMIN);
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  const value = {
    ...state,
    login,
    logout,
    hasRole,
    isAdmin,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
