import { createContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

export const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [status, setStatus] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
      return;
    }

    const socket = io(SOCKET_URL, {
      withCredentials: true, // sends the tt_session cookie on handshake
      transports: ['websocket'],
    });
    socketRef.current = socket;
    setStatus('connecting');

    socket.on('connect', () => {
      setStatus('connected');
      setReconnectAttempts(0);
    });
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.on('reconnect_attempt', (attempt) => setReconnectAttempts(attempt));
    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
      setStatus('disconnected');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  const emit = useCallback((event, payload) => socketRef.current?.emit(event, payload), []);
  const joinRoom = useCallback((projectId) => socketRef.current?.emit('join_room', projectId), []);
  const leaveRoom = useCallback((projectId) => socketRef.current?.emit('leave_room', projectId), []);
  const onEvent = useCallback((event, callback) => {
    socketRef.current?.on(event, callback);
    return () => socketRef.current?.off(event, callback);
  }, []);

  return (
    <SocketContext.Provider value={{ status, reconnectAttempts, emit, joinRoom, leaveRoom, onEvent }}>
      {children}
    </SocketContext.Provider>
  );
}