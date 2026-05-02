import { useEffect, useRef, useState, useCallback } from 'react';
import * as signalR from '@microsoft/signalr';
import { API_BASE_URL } from '../constants/api';

/**
 * Hook for video processing progress tracking via SignalR.
 * Connection is lazy - only connects when startConnection() is called.
 * Uses relative URL for same-origin (wwwroot) deployment.
 */
export const useVideoProcessingSignalR = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [orderProgress, setOrderProgress] = useState({});
  const connectionRef = useRef(null);
  const eventsBoundRef = useRef(false);

  // Build hub URL: same-origin relative path for wwwroot, or absolute for dev proxy
  const getHubUrl = useCallback(() => {
    if (!API_BASE_URL || API_BASE_URL === '/api') {
      // Same-origin (wwwroot) - use relative path
      return '/videoProcessingHub';
    }
    // Dev/external API - strip /api suffix
    return API_BASE_URL.replace(/\/api\/?$/, '') + '/videoProcessingHub';
  }, []);

  // Create connection once (lazy, not in effect)
  const getOrCreateConnection = useCallback(() => {
    if (connectionRef.current) return connectionRef.current;

    const hubUrl = getHubUrl();
    const conn = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    conn.onreconnecting(() => setIsConnected(false));
    conn.onreconnected(() => setIsConnected(true));
    conn.onclose(() => setIsConnected(false));

    connectionRef.current = conn;
    return conn;
  }, [getHubUrl]);

  // Bind SignalR event handlers to update orderProgress state
  const bindEvents = useCallback((conn) => {
    if (eventsBoundRef.current) return;

    conn.on('ProgressUpdate', (data) => {
      setOrderProgress(prev => ({
        ...prev,
        [data.orderId]: {
          progress: data.progress,
          message: data.message,
          stage: data.stage,
          status: 'downloading',
        },
      }));
    });

    conn.on('VideoCompleted', (data) => {
      setOrderProgress(prev => ({
        ...prev,
        [data.orderId]: {
          progress: 100,
          message: data.message,
          stage: 'completed',
          status: 'completed',
        },
      }));
    });

    conn.on('VideoError', (data) => {
      setOrderProgress(prev => ({
        ...prev,
        [data.orderId]: {
          progress: -1,
          message: data.message,
          stage: 'error',
          status: 'error',
        },
      }));
    });

    eventsBoundRef.current = true;
  }, []);

  // Start connection (lazy - call this explicitly, not on mount)
  const startConnection = useCallback(async () => {
    const conn = getOrCreateConnection();
    bindEvents(conn);

    if (conn.state === signalR.HubConnectionState.Connected) return;
    if (conn.state === signalR.HubConnectionState.Connecting) return;

    try {
      await conn.start();
      setIsConnected(true);
      console.log('SignalR connected');
    } catch (error) {
      console.error('SignalR connection failed:', error);
      setIsConnected(false);
    }
  }, [getOrCreateConnection, bindEvents]);

  // Ensure connected, then invoke
  const ensureConnectedAndInvoke = useCallback(async (methodName, ...args) => {
    const conn = getOrCreateConnection();
    bindEvents(conn);

    if (conn.state !== signalR.HubConnectionState.Connected) {
      await conn.start();
      setIsConnected(true);
    }

    return await conn.invoke(methodName, ...args);
  }, [getOrCreateConnection, bindEvents]);

  // Join order group
  const joinOrderGroup = useCallback(async (orderId) => {
    try {
      await ensureConnectedAndInvoke('JoinOrderGroup', orderId);
    } catch (error) {
      console.error('Failed to join order group:', error);
    }
  }, [ensureConnectedAndInvoke]);

  // Leave order group
  const leaveOrderGroup = useCallback(async (orderId) => {
    try {
      await ensureConnectedAndInvoke('LeaveOrderGroup', orderId);
    } catch (error) {
      console.error('Failed to leave order group:', error);
    }
  }, [ensureConnectedAndInvoke]);

  // Clear progress for an order
  const clearProgress = useCallback((orderId) => {
    setOrderProgress(prev => {
      const next = { ...prev };
      delete next[orderId];
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop();
        connectionRef.current = null;
        eventsBoundRef.current = false;
      }
    };
  }, []);

  return {
    isConnected,
    orderProgress,
    startConnection,
    joinOrderGroup,
    leaveOrderGroup,
    clearProgress,
  };
};
