import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import messageService from '../../services/messageService';

export default function ChatPanel({ projectId, height = '100%' }) {
  const { user } = useContext(AuthContext);
  // NOTE: joinRoom/leaveRoom are deliberately NOT called here —
  // ProjectWorkspacePage.jsx already owns that lifecycle for this projectId.
  const { isConnected, onEvent, sendMessage, sendTyping, markRead } = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState('');
  const [typingUser, setTypingUser] = useState(null);

  const bottomRef = useRef(null);
  const conversationIdRef = useRef(null);

  // ── Load history once the project room is known ───────────────────────────
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    async function loadHistory() {
      try {
        setLoading(true);
        const convRes = await messageService.getOrCreateConversation(projectId);
        const conversation = convRes.data ?? convRes;
        conversationIdRef.current = conversation._id;

        const historyRes = await messageService.getMessages(conversation._id);
        const history = historyRes.messages ?? historyRes.data?.messages ?? [];

        if (!cancelled) setMessages(history);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load messages.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHistory();
    return () => { cancelled = true; };
  }, [projectId]);

  // ── Real-time listeners ────────────────────────────────────────────────────
  useEffect(() => {
    const offNewMessage = onEvent('new-message', (message) => {
      setMessages((prev) => [...prev, message]);
    });
    const offTypingStart = onEvent('typing-start', ({ userId }) => {
      if (userId !== user?.userId) setTypingUser(userId);
    });
    const offTypingStop = onEvent('typing-stop', ({ userId }) => {
      setTypingUser((current) => (current === userId ? null : current));
    });
    const offError = onEvent('error', ({ message }) => setError(message));

    return () => {
      offNewMessage?.();
      offTypingStart?.();
      offTypingStop?.();
      offError?.();
    };
  }, [onEvent, user?.userId]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Mark last incoming message read ────────────────────────────────────────
  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    if (last.sender?._id !== user?.userId) {
      markRead(projectId, last._id);
    }
  }, [messages, projectId, user?.userId, markRead]);

  const handleSend = useCallback((e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMessage({ projectId, text: draft.trim() });
    setDraft('');
  }, [draft, projectId, sendMessage]);

  const handleChange = (e) => {
    setDraft(e.target.value);
    sendTyping(projectId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height, width: '100%',
                   background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                   borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', fontSize: 11, fontFamily: 'monospace',
                     color: isConnected ? '#4ade80' : '#fbbf24', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {isConnected ? '● Connected' : '○ Connecting…'}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {loading && <div style={{ color: '#475569', fontSize: 13, fontFamily: 'monospace' }}>Loading conversation…</div>}
        {error && <div style={{ color: '#f87171', fontSize: 13, fontFamily: 'monospace' }}>{error}</div>}

        {!loading && !error && messages.map((msg) => {
          const isOwn = msg.sender?._id === user?.userId;
          return (
            <div key={msg._id} style={{
              marginBottom: 10, display: 'flex', flexDirection: 'column',
              alignItems: isOwn ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '75%', padding: '8px 12px', borderRadius: 10,
                background: isOwn ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isOwn ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.08)'}`,
              }}>
                <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginBottom: 3 }}>
                  {msg.sender?.name || 'Unknown'}
                </div>
                <div style={{ fontSize: 13, color: '#e2e8f0' }}>{msg.messageText}</div>
                {msg.fileUrl && (
                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                     style={{ fontSize: 12, color: '#60a5fa' }}>
                    Attachment
                  </a>
                )}
              </div>
              <div style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace', marginTop: 2 }}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          );
        })}

        {typingUser && (
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', fontStyle: 'italic' }}>
            Someone is typing…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <input
          type="text"
          value={draft}
          onChange={handleChange}
          placeholder="Type a message…"
          disabled={!isConnected}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none',
          }}
        />
        <button type="submit" disabled={!isConnected || !draft.trim()} style={{
          background: '#166534', border: 'none', borderRadius: 8, color: '#e2e8f0',
          padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'monospace',
        }}>
          Send
        </button>
      </form>
    </div>
  );
}