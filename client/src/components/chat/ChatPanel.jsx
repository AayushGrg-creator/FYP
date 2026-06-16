/**
 * client/src/components/chat/ChatPanel.jsx
 *
 * Real-time project chat panel for Task Tide's workspace.
 *
 * Features
 * ─────────
 *  • Socket.io real-time messaging via useSocket hook
 *  • Optimistic message rendering (message appears instantly, confirmed by server)
 *  • Typing indicator with multi-user support ("Alice and Bob are typing…")
 *  • Unread message badge that clears when panel is in view
 *  • Auto-scroll to bottom on new messages (respects user scroll position)
 *  • File attachment support — image preview + generic file card
 *  • Message grouping — consecutive messages from same sender are visually merged
 *  • Reconnection state banner
 *  • Infinite scroll upward to load older messages (cursor-based pagination)
 *
 * Props
 * ─────
 *  projectId    {string}   required — the active project's ID
 *  currentUser  {Object}   { id, name, avatar, role }
 *  height       {string}   CSS height of the panel  default '100%'
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  memo,
} from 'react';
import { AuthContext }  from '../../context/AuthContext';
import { useSocket }    from '../../hooks/useSocket';
import MessageBubble    from './MessageBubble';
import api              from '../../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE           = 30;      // messages per page (older messages)
const SCROLL_THRESHOLD    = 120;     // px from bottom — auto-scroll kicks in below this
const MAX_FILE_MB         = 10;
const ACCEPTED_FILE_TYPES = 'image/*,.pdf,.zip,.tar,.gz,.doc,.docx,.txt';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function uuid() {
  return `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function humanFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function groupMessages(messages) {
  // Returns messages annotated with isFirstInGroup
  return messages.map((msg, i) => {
    const prev = messages[i - 1];
    const isFirstInGroup =
      !prev ||
      prev.senderId !== msg.senderId ||
      new Date(msg.sentAt) - new Date(prev.sentAt) > 5 * 60 * 1000; // 5-min gap
    return { ...msg, isFirstInGroup };
  });
}

// ─── Connection status banner ─────────────────────────────────────────────────
function ConnectionBanner({ status, reconnectAttempts }) {
  if (status === 'connected') return null;

  const messages = {
    connecting:    reconnectAttempts > 0
      ? `Reconnecting… (attempt ${reconnectAttempts}/10)`
      : 'Connecting…',
    disconnected:  'Connection lost — messages may not arrive',
    error:         'Unable to connect — check your network',
  };

  const colors = {
    connecting:   { bg: '#1c1917', border: '#854d0e', text: '#fbbf24' },
    disconnected: { bg: '#1c1917', border: '#7f1d1d', text: '#fca5a5' },
    error:        { bg: '#1c0a0a', border: '#7f1d1d', text: '#f87171' },
  };

  const c = colors[status] || colors.disconnected;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding:      '8px 16px',
        background:   c.bg,
        borderBottom: `1px solid ${c.border}`,
        color:        c.text,
        fontSize:     '12px',
        fontFamily:   'monospace',
        textAlign:    'center',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        gap:          '6px',
      }}
    >
      <span
        style={{
          display:     'inline-block',
          width:       7,
          height:      7,
          borderRadius:'50%',
          background:  c.text,
          animation:   status === 'connecting' ? 'pulse 1.2s infinite' : 'none',
        }}
      />
      {messages[status]}
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator({ typers }) {
  if (!typers || typers.length === 0) return <div style={{ height: 24 }} />;

  const names = typers.slice(0, 3).join(', ');
  const suffix = typers.length > 3
    ? ` and ${typers.length - 3} others`
    : typers.length === 1 ? ' is typing' : ' are typing';

  return (
    <div
      aria-live="polite"
      style={{
        height:     24,
        display:    'flex',
        alignItems: 'center',
        gap:        8,
        paddingLeft:16,
        fontSize:   12,
        color:      '#64748b',
        fontFamily: 'monospace',
      }}
    >
      {/* Animated dots */}
      <span style={{ display:'flex', gap:3, alignItems:'center' }}>
        {[0,1,2].map((i) => (
          <span
            key={i}
            style={{
              width:        5,
              height:       5,
              borderRadius: '50%',
              background:   '#475569',
              animation:    `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              display:      'inline-block',
            }}
          />
        ))}
      </span>
      <span>{names}{suffix}…</span>
    </div>
  );
}

// ─── File preview pill ────────────────────────────────────────────────────────
function FilePill({ file, onRemove }) {
  if (!file) return null;
  return (
    <div
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:         8,
        padding:     '6px 10px',
        background:  'rgba(255,255,255,0.05)',
        borderRadius:8,
        border:      '1px solid rgba(255,255,255,0.10)',
        fontSize:    12,
        color:       '#94a3b8',
        fontFamily:  'monospace',
        maxWidth:    280,
      }}
    >
      <span>📎</span>
      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>
        {file.name}
      </span>
      <span style={{ color:'#475569', flexShrink:0 }}>
        {humanFileSize(file.size)}
      </span>
      <button
        onClick={onRemove}
        aria-label="Remove attachment"
        style={{
          background: 'none',
          border:     'none',
          color:      '#ef4444',
          cursor:     'pointer',
          padding:    '0 2px',
          fontSize:   14,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Main ChatPanel ───────────────────────────────────────────────────────────
function ChatPanel({ projectId, height = '100%' }) {
  const { user }                     = useContext(AuthContext);
  const { status, reconnectAttempts, onEvent, sendMessage, sendTyping, markRead }
                                     = useSocket();

  // Message state
  const [messages,    setMessages]    = useState([]);
  const [hasMore,     setHasMore]     = useState(true);
  const [loadingOld,  setLoadingOld]  = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const cursorRef                     = useRef(null);   // oldest message ID for pagination

  // Input state
  const [text,        setText]        = useState('');
  const [file,        setFile]        = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [sendError,   setSendError]   = useState(null);

  // Typing state  { socketId: { name, timestamp } }
  const [typers,      setTypers]      = useState([]);

  // Scroll state
  const listRef         = useRef(null);
  const bottomRef       = useRef(null);
  const isNearBottom    = useRef(true);
  const [unread, setUnread] = useState(0);

  // File input ref
  const fileInputRef = useRef(null);

  // ── Fetch initial + paginated messages ────────────────────────────────────
  const fetchMessages = useCallback(async (cursor = null) => {
    if (!projectId) return;
    try {
      const params = { limit: PAGE_SIZE };
      if (cursor) params.before = cursor;
      const { data } = await api.get(`/messages/${projectId}`, { params });
      const fetched = data.messages || [];

      if (cursor) {
        // Prepend older messages
        setMessages((prev) => [...fetched, ...prev]);
      } else {
        setMessages(fetched);
        setInitialLoad(false);
      }
      if (fetched.length > 0) {
        cursorRef.current = fetched[0].id;
      }
      setHasMore(fetched.length === PAGE_SIZE);
    } catch (err) {
      console.error('[ChatPanel] fetchMessages error', err);
    }
  }, [projectId]);

  useEffect(() => {
    setMessages([]);
    setUnread(0);
    setHasMore(true);
    cursorRef.current = null;
    setInitialLoad(true);
    fetchMessages();
  }, [fetchMessages]);

  // ── Socket events ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;

    const cleanNew = onEvent('new-message', (msg) => {
      if (msg.projectId !== projectId) return;

      setMessages((prev) => {
        // Replace optimistic message if tempId matches
        if (msg.tempId) {
          const idx = prev.findIndex((m) => m.tempId === msg.tempId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = { ...msg, status: 'delivered' };
            return updated;
          }
        }
        return [...prev, { ...msg, status: 'delivered' }];
      });

      // Auto-scroll or increment unread badge
      if (isNearBottom.current) {
        requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
        markRead(projectId, msg.id);
      } else if (msg.senderId !== user?.id) {
        setUnread((n) => n + 1);
      }
    });

    const cleanTypStart = onEvent('typing-start', ({ userId: tid, userName }) => {
      if (tid === user?.id) return;
      setTypers((prev) => {
        if (prev.includes(userName)) return prev;
        return [...prev, userName];
      });
    });

    const cleanTypStop = onEvent('typing-stop', ({ userId: tid, userName }) => {
      if (tid === user?.id) return;
      setTypers((prev) => prev.filter((n) => n !== userName));
    });

    const cleanRead = onEvent('messages-read', ({ userId: rid }) => {
      if (rid === user?.id) return;
      setMessages((prev) =>
        prev.map((m) => (m.senderId === user?.id ? { ...m, status: 'read' } : m))
      );
    });

    return () => {
      cleanNew();
      cleanTypStart();
      cleanTypStop();
      cleanRead();
    };
  }, [projectId, onEvent, markRead, user?.id]);

  // ── Scroll tracking ───────────────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottom.current = distFromBottom < SCROLL_THRESHOLD;

    // Clear unread when user scrolls to bottom
    if (isNearBottom.current && unread > 0) {
      setUnread(0);
      const last = messages[messages.length - 1];
      if (last) markRead(projectId, last.id);
    }

    // Infinite scroll — load older messages when scrolled to top
    if (el.scrollTop < 60 && hasMore && !loadingOld) {
      const prevHeight = el.scrollHeight;
      setLoadingOld(true);
      fetchMessages(cursorRef.current).finally(() => {
        setLoadingOld(false);
        // Maintain scroll position after prepend
        requestAnimationFrame(() => {
          if (el) el.scrollTop = el.scrollHeight - prevHeight;
        });
      });
    }
  }, [unread, messages, hasMore, loadingOld, fetchMessages, markRead, projectId]);

  // Auto-scroll on initial load
  useEffect(() => {
    if (!initialLoad) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [initialLoad]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !file) return;
    setSendError(null);

    let fileUrl  = null;
    let fileType = null;

    // Upload file first if present
    if (file) {
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setSendError(`File too large — maximum is ${MAX_FILE_MB} MB`);
        return;
      }
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        fileUrl  = data.url;
        fileType = data.type;
      } catch {
        setSendError('File upload failed — please try again');
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    const tempId = uuid();

    // Optimistic message
    const optimistic = {
      id:           tempId,
      tempId,
      projectId,
      senderId:     user?.id,
      senderName:   user?.name,
      senderAvatar: user?.avatar,
      text:         trimmed,
      fileUrl,
      fileType,
      sentAt:       new Date().toISOString(),
      status:       'sending',
    };

    setMessages((prev) => [...prev, optimistic]);
    setText('');
    setFile(null);
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));

    sendMessage({ projectId, text: trimmed, fileUrl, fileType, tempId });
  }, [text, file, projectId, user, sendMessage]);

  // ── Keyboard shortcut — Enter to send, Shift+Enter for newline ─────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleTextChange = useCallback((e) => {
    setText(e.target.value);
    sendTyping(projectId);
  }, [sendTyping, projectId]);

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFileChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setSendError(`File too large — maximum is ${MAX_FILE_MB} MB`);
      return;
    }
    setSendError(null);
    setFile(f);
    e.target.value = '';
  }, []);

  // ── Grouped messages ──────────────────────────────────────────────────────
  const grouped = groupMessages(messages);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display:       'flex',
        flexDirection: 'column',
        height,
        background:    '#0d1117',
        borderRadius:  '12px',
        border:        '1px solid rgba(255,255,255,0.07)',
        overflow:      'hidden',
        fontFamily:    "'DM Sans', system-ui, sans-serif",
      }}
    >
      {/* ── Keyframes injected once ── */}
      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .chat-input:focus { outline: none; }
        .send-btn:hover:not(:disabled) { background: #1d4ed8 !important; }
        .attach-btn:hover { background: rgba(255,255,255,0.08) !important; }
        .scroll-bottom-btn:hover { background: #1e40af !important; }
      `}</style>

      {/* ── Header ── */}
      <div
        style={{
          padding:        '12px 16px',
          borderBottom:   '1px solid rgba(255,255,255,0.07)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          background:     '#0d1117',
          flexShrink:     0,
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>💬</span>
          <span
            style={{
              fontSize:    13,
              fontWeight:  600,
              color:       '#e2e8f0',
              fontFamily:  'monospace',
              letterSpacing:'0.3px',
            }}
          >
            Project Chat
          </span>
          {/* Live dot */}
          <span
            style={{
              width:        7,
              height:       7,
              borderRadius: '50%',
              background:   status === 'connected' ? '#4ade80' : '#ef4444',
              boxShadow:    status === 'connected' ? '0 0 6px #4ade80' : 'none',
              animation:    status === 'connected' ? 'pulse 2s infinite' : 'none',
              flexShrink:   0,
            }}
          />
        </div>
        <span
          style={{
            fontSize:  11,
            color:     '#475569',
            fontFamily:'monospace',
          }}
        >
          {messages.length} messages
        </span>
      </div>

      {/* ── Connection banner ── */}
      <ConnectionBanner status={status} reconnectAttempts={reconnectAttempts} />

      {/* ── Message list ── */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          flex:       1,
          overflowY:  'auto',
          overflowX:  'hidden',
          padding:    '12px 8px 4px',
          display:    'flex',
          flexDirection:'column',
          gap:        0,
          scrollbarWidth: 'thin',
          scrollbarColor: '#1e293b transparent',
        }}
      >
        {/* Load older trigger */}
        {hasMore && (
          <div style={{ textAlign:'center', marginBottom:12 }}>
            {loadingOld ? (
              <span style={{ fontSize:11, color:'#475569', fontFamily:'monospace' }}>
                Loading…
              </span>
            ) : (
              <button
                onClick={() => {
                  setLoadingOld(true);
                  const el = listRef.current;
                  const prevHeight = el?.scrollHeight || 0;
                  fetchMessages(cursorRef.current).finally(() => {
                    setLoadingOld(false);
                    requestAnimationFrame(() => {
                      if (el) el.scrollTop = el.scrollHeight - prevHeight;
                    });
                  });
                }}
                style={{
                  background: 'none',
                  border:     '1px solid rgba(255,255,255,0.10)',
                  borderRadius:6,
                  color:      '#64748b',
                  fontSize:   11,
                  padding:    '4px 12px',
                  cursor:     'pointer',
                  fontFamily: 'monospace',
                }}
              >
                ↑ Load older messages
              </button>
            )}
          </div>
        )}

        {/* Empty state */}
        {!initialLoad && messages.length === 0 && (
          <div
            style={{
              flex:           1,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              gap:            8,
              color:          '#334155',
              padding:        '40px 20px',
            }}
          >
            <span style={{ fontSize:36 }}>💬</span>
            <span style={{ fontSize:13, fontFamily:'monospace' }}>
              No messages yet — say hello!
            </span>
          </div>
        )}

        {/* Messages */}
        {grouped.map((msg) => (
          <div
            key={msg.id || msg.tempId}
            style={{ animation: 'fadeUp 0.18s ease' }}
          >
            <MessageBubble
              message={msg}
              isOwn={msg.senderId === user?.id}
              showAvatar={msg.isFirstInGroup}
              isFirstInGroup={msg.isFirstInGroup}
            />
          </div>
        ))}

        {/* Typing indicator */}
        <TypingIndicator typers={typers} />

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* ── Unread badge & scroll-to-bottom button ── */}
      {unread > 0 && (
        <div style={{ position:'relative' }}>
          <button
            className="scroll-bottom-btn"
            onClick={() => {
              setUnread(0);
              bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={{
              position:   'absolute',
              bottom:     8,
              right:      16,
              background: '#1d4ed8',
              border:     'none',
              borderRadius:20,
              color:      '#fff',
              fontSize:   12,
              padding:    '5px 12px',
              cursor:     'pointer',
              display:    'flex',
              alignItems: 'center',
              gap:        6,
              fontFamily: 'monospace',
              boxShadow:  '0 4px 12px rgba(29,78,216,0.4)',
              transition: 'background 0.15s',
            }}
          >
            ↓ {unread} new
          </button>
        </div>
      )}

      {/* ── File preview ── */}
      {file && (
        <div style={{ padding:'0 12px 6px' }}>
          <FilePill file={file} onRemove={() => setFile(null)} />
        </div>
      )}

      {/* ── Error message ── */}
      {sendError && (
        <div
          style={{
            padding:   '6px 16px',
            fontSize:  12,
            color:     '#f87171',
            fontFamily:'monospace',
            borderTop: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          ⚠ {sendError}
        </div>
      )}

      {/* ── Input area ── */}
      <div
        style={{
          padding:      '10px 12px',
          borderTop:    '1px solid rgba(255,255,255,0.07)',
          display:      'flex',
          alignItems:   'flex-end',
          gap:          8,
          background:   '#0d1117',
          flexShrink:   0,
        }}
      >
        {/* Attach file button */}
        <button
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          aria-label="Attach file"
          title="Attach file (max 10 MB)"
          style={{
            background:   'rgba(255,255,255,0.04)',
            border:       '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            color:        '#64748b',
            cursor:       'pointer',
            padding:      '9px 10px',
            fontSize:     16,
            lineHeight:   1,
            flexShrink:   0,
            transition:   'background 0.15s',
          }}
        >
          📎
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={handleFileChange}
          style={{ display:'none' }}
        />

        {/* Text input */}
        <textarea
          className="chat-input"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
          rows={1}
          style={{
            flex:         1,
            background:   'rgba(255,255,255,0.04)',
            border:       '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            color:        '#e2e8f0',
            fontSize:     14,
            lineHeight:   1.5,
            padding:      '9px 13px',
            resize:       'none',
            fontFamily:   "'DM Sans', system-ui, sans-serif",
            maxHeight:    120,
            transition:   'border-color 0.15s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; }}
          onBlur={(e)  => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          onInput={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          disabled={uploading}
        />

        {/* Send button */}
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={(!text.trim() && !file) || uploading}
          aria-label="Send message"
          style={{
            background:   '#2563eb',
            border:       'none',
            borderRadius: 8,
            color:        '#fff',
            cursor:       'pointer',
            padding:      '9px 14px',
            fontSize:     16,
            lineHeight:   1,
            flexShrink:   0,
            opacity:      (!text.trim() && !file) || uploading ? 0.4 : 1,
            transition:   'background 0.15s, opacity 0.15s',
          }}
        >
          {uploading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  );
}

export default memo(ChatPanel);