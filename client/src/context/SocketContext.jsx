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

  // Rooms the app has asked to join, regardless of whether the underlying
  // socket existed yet at the time. Re-applied on every successful
  // connect — fixes two related bugs:
  //   1. joinRoom() called before the socket instance exists yet (e.g.
  //      AuthContext hydrates a beat later on one tab than another) used
  //      to silently no-op via `socketRef.current?.emit(...)`, with no
  //      retry — that socket never actually joined the room, so it never
  //      received broadcasts for that project (including its own sent
  //      messages), even though it looked "Connected".
  //   2. Any reconnect (dropped wifi, server restart) previously lost
  //      room membership permanently until a manual page refresh.
  const desiredRoomsRef = useRef(new Set());

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      desiredRoomsRef.current.clear();
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
      // Re-join every room the app currently wants to be in — covers both
      // the first-connect race and any later reconnect.
      desiredRoomsRef.current.forEach((projectId) => {
        socket.emit('join_room', projectId);
      });
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

  const joinRoom = useCallback((projectId) => {
    desiredRoomsRef.current.add(projectId);
    socketRef.current?.emit('join_room', projectId);
  }, []);

  const leaveRoom = useCallback((projectId) => {
    desiredRoomsRef.current.delete(projectId);
    socketRef.current?.emit('leave_room', projectId);
  }, []);

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