import React from 'react';

export default function LevelBadge({ level, size = 36 }) {
  return (
    <div
      title={`Level ${level}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#1a1a1a',
        border: '2px solid #00e5a0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif',
        fontWeight: 700,
        fontSize: size * 0.4,
        color: '#00e5a0',
        flexShrink: 0,
      }}
    >
      {level}
    </div>
  );
}