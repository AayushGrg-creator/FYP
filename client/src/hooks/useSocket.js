import { useContext, useCallback, useRef, useEffect } from 'react';
import { SocketContext } from '../context/SocketContext';

const TYPING_DEBOUNCE_MS = 1_500;

/**
 * useSocket Custom Hook
 * Provides high-level communication primitives for Task Tide.
 * Features debounced typing triggers and stable room lifecycle management.
 */
export function useSocket() {
  const ctx = useContext(SocketContext);

  if (!ctx) {
    throw new Error('useSocket must be consumed inside a <SocketProvider>.');
  }

  const { status, reconnectAttempts, emit, joinRoom, leaveRoom, onEvent } = ctx;
  const typingTimer = useRef(null);
  const isConnected = status === 'connected';

  // ── Cleanup: Prevent memory leaks on unmount ──────────────────────────────
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  // ── High-Level Messaging Pipeline ─────────────────────────────────────────
  const sendMessage = useCallback((payload) => {
    const { projectId, text, fileUrl } = payload;
    
    if (!isConnected) {
      console.warn('Socket: Message queued but connection is currently offline.');
      return;
    }
    if (!projectId || (!text?.trim() && !fileUrl)) return;

    emit('send-message', {
      ...payload,
      text: text?.trim() || '',
      sentAt: new Date().toISOString(),
    });
  }, [emit, isConnected]);

  // ── Real-time Typing Indicator with Debounce ──────────────────────────────
  const sendTyping = useCallback((projectId) => {
    if (!projectId || !isConnected) return;

    emit('typing-start', { projectId });

    if (typingTimer.current) clearTimeout(typingTimer.current);
    
    typingTimer.current = setTimeout(() => {
      emit('typing-stop', { projectId });
    }, TYPING_DEBOUNCE_MS);
  }, [emit, isConnected]);

  // ── Read Receipt Synchronization ──────────────────────────────────────────
  const markRead = useCallback((projectId, lastMessageId) => {
    if (!projectId || !lastMessageId || !isConnected) return;
    emit('mark-read', { projectId, lastMessageId });
  }, [emit, isConnected]);

  // ── Scope-Specific Room Manager (Stable reference) ────────────────────────
  const useProjectRoom = useCallback((projectId) => {
    return {
      join: () => joinRoom(projectId),
      leave: () => leaveRoom(projectId),
    };
  }, [joinRoom, leaveRoom]);

  return {
    status,
    isConnected,
    reconnectAttempts,
    emit,
    joinRoom,
    leaveRoom,
    onEvent,
    sendMessage,
    sendTyping,
    markRead,
    useProjectRoom,
  };
}