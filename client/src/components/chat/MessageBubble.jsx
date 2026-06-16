/**
 * client/src/components/chat/MessageBubble.jsx
 *
 * Individual message bubble component for Task Tide's project workspace chat.
 *
 * Visual design: dark utilitarian — tight monospace timestamps, clean
 * pill-shaped bubbles, status ticks, file attachment cards.
 *
 * Props
 * ─────
 *  message   {Object}   Message document from API or optimistic state
 *    .id           string
 *    .text         string
 *    .senderId     string
 *    .senderName   string
 *    .senderAvatar string|null
 *    .sentAt       ISO string
 *    .fileUrl      string|null
 *    .fileType     'image'|'pdf'|'archive'|'other'|null
 *    .status       'sending'|'sent'|'delivered'|'read'|'failed'
 *    .tempId       string|null   (optimistic message identifier)
 *  isOwn     {boolean}  true if message was sent by the current user
 *  showAvatar {boolean} whether to render the sender avatar (grouped messages hide it)
 *  isFirstInGroup {boolean}  first message from this sender in a consecutive block
 */

import { useState, memo } from 'react';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(isoString) {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour:   '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
}

// ─── Status tick indicator ────────────────────────────────────────────────────
function StatusTick({ status }) {
  const map = {
    sending:   { symbol: '○', color: '#6b7280', title: 'Sending…' },
    sent:      { symbol: '✓', color: '#6b7280', title: 'Sent' },
    delivered: { symbol: '✓✓', color: '#6b7280', title: 'Delivered' },
    read:      { symbol: '✓✓', color: '#34d399', title: 'Read' },
    failed:    { symbol: '!', color: '#ef4444', title: 'Failed to send' },
  };
  const tick = map[status] || map.sent;
  return (
    <span
      title={tick.title}
      style={{
        fontSize:    '10px',
        color:       tick.color,
        marginLeft:  '4px',
        fontFamily:  'monospace',
        userSelect:  'none',
        flexShrink:  0,
      }}
    >
      {tick.symbol}
    </span>
  );
}

// ─── File attachment card ─────────────────────────────────────────────────────
function FileAttachment({ fileUrl, fileType }) {
  const [imgError, setImgError] = useState(false);

  if (!fileUrl) return null;

  // Image preview
  if (fileType === 'image' && !imgError) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'block', marginTop: '8px' }}
      >
        <img
          src={fileUrl}
          alt="Attachment"
          onError={() => setImgError(true)}
          style={{
            maxWidth:     '240px',
            maxHeight:    '180px',
            borderRadius: '8px',
            objectFit:    'cover',
            border:       '1px solid rgba(255,255,255,0.08)',
            display:      'block',
          }}
        />
      </a>
    );
  }

  // Generic file card
  const icons = { pdf: '📄', archive: '🗜️', other: '📎' };
  const icon  = icons[fileType] || icons.other;
  const name  = fileUrl.split('/').pop() || 'attachment';

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '8px',
        marginTop:      '8px',
        padding:        '8px 12px',
        background:     'rgba(255,255,255,0.06)',
        borderRadius:   '8px',
        border:         '1px solid rgba(255,255,255,0.10)',
        textDecoration: 'none',
        color:          'inherit',
        fontSize:       '12px',
        fontFamily:     'monospace',
        maxWidth:       '240px',
        wordBreak:      'break-all',
      }}
    >
      <span style={{ fontSize: '18px', flexShrink: 0 }}>{icon}</span>
      <span style={{ color: '#a3e635', textDecoration: 'underline' }}>{name}</span>
    </a>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 32 }) {
  const [err, setErr] = useState(false);
  const initials = getInitials(name);

  if (src && !err) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setErr(true)}
        style={{
          width:        size,
          height:       size,
          borderRadius: '50%',
          objectFit:    'cover',
          flexShrink:   0,
          border:       '2px solid rgba(255,255,255,0.10)',
        }}
      />
    );
  }

  // Fallback initials avatar
  return (
    <div
      aria-label={name}
      style={{
        width:           size,
        height:          size,
        borderRadius:    '50%',
        background:      'linear-gradient(135deg, #1e3a5f 0%, #0f2a47 100%)',
        border:          '2px solid rgba(255,255,255,0.10)',
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        fontSize:        size * 0.35,
        fontWeight:      700,
        color:           '#7dd3fc',
        flexShrink:      0,
        fontFamily:      'monospace',
        letterSpacing:   '0.5px',
      }}
    >
      {initials}
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({ message, isOwn, showAvatar = true, isFirstInGroup = true }) {
  const {
    text,
    senderName,
    senderAvatar,
    sentAt,
    fileUrl,
    fileType,
    status = 'sent',
    tempId,
  } = message;

  const isPending = status === 'sending' || Boolean(tempId && status !== 'sent');
  const isFailed  = status === 'failed';

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  isOwn ? 'row-reverse' : 'row',
        alignItems:     'flex-end',
        gap:            '8px',
        marginBottom:   isFirstInGroup ? '12px' : '3px',
        opacity:        isPending ? 0.65 : 1,
        transition:     'opacity 0.2s ease',
        paddingLeft:    isOwn ? '48px' : '0',
        paddingRight:   isOwn ? '0' : '48px',
      }}
    >
      {/* Avatar — shown for incoming messages only */}
      {!isOwn && (
        <div style={{ width: 32, flexShrink: 0 }}>
          {showAvatar
            ? <Avatar src={senderAvatar} name={senderName} size={32} />
            : <div style={{ width: 32 }} />
          }
        </div>
      )}

      {/* Bubble column */}
      <div
        style={{
          display:       'flex',
          flexDirection: 'column',
          alignItems:    isOwn ? 'flex-end' : 'flex-start',
          maxWidth:      '72%',
          gap:           '3px',
        }}
      >
        {/* Sender name — only on first in group for incoming */}
        {!isOwn && isFirstInGroup && (
          <span
            style={{
              fontSize:     '11px',
              fontWeight:   600,
              color:        '#94a3b8',
              paddingLeft:  '4px',
              fontFamily:   'monospace',
              letterSpacing:'0.3px',
            }}
          >
            {senderName}
          </span>
        )}

        {/* Main bubble */}
        <div
          style={{
            padding:       text && fileUrl ? '10px 14px 6px' : '10px 14px',
            borderRadius:  isOwn
              ? '16px 4px 16px 16px'
              : '4px 16px 16px 16px',
            background:    isOwn
              ? isFailed
                ? 'linear-gradient(135deg, #450a0a, #7f1d1d)'
                : 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)'
              : 'rgba(255,255,255,0.055)',
            border:        isOwn
              ? isFailed
                ? '1px solid rgba(239,68,68,0.4)'
                : '1px solid rgba(14,165,233,0.25)'
              : '1px solid rgba(255,255,255,0.08)',
            boxShadow:     isOwn
              ? '0 2px 12px rgba(12,74,110,0.3)'
              : '0 2px 8px rgba(0,0,0,0.2)',
            wordBreak:     'break-word',
            position:      'relative',
          }}
        >
          {/* Message text */}
          {text && (
            <p
              style={{
                margin:      0,
                fontSize:    '14px',
                lineHeight:  1.55,
                color:       isOwn ? '#e0f2fe' : '#e2e8f0',
                whiteSpace:  'pre-wrap',
                fontFamily:  "'DM Sans', system-ui, sans-serif",
              }}
            >
              {text}
            </p>
          )}

          {/* File attachment */}
          <FileAttachment fileUrl={fileUrl} fileType={fileType} />
        </div>

        {/* Timestamp + status row */}
        <div
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '2px',
            paddingLeft: isOwn ? 0   : '4px',
            paddingRight:isOwn ? '4px' : 0,
          }}
        >
          <span
            style={{
              fontSize:  '10px',
              color:     '#475569',
              fontFamily:'monospace',
            }}
          >
            {isFailed ? 'Failed to send · ' : ''}{formatTime(sentAt)}
          </span>
          {isOwn && <StatusTick status={status} />}
        </div>
      </div>
    </div>
  );
}

export default memo(MessageBubble);