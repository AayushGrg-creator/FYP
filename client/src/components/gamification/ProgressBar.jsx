import React from 'react';

export default function ProgressBar({ level, points, pointsIntoLevel, pointsForNextLevel, percent }) {
  const isMaxLevel = pointsForNextLevel === null;

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: '8px',
      }}>
        <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 600, color: '#ffffff', fontSize: '15px' }}>
          Level {level}
        </span>
        <span style={{ fontFamily: 'DM Sans, sans-serif', color: '#9a9a9a', fontSize: '13px' }}>
          {isMaxLevel
            ? `${points} pts (max level)`
            : `${pointsIntoLevel} / ${pointsForNextLevel} pts`}
        </span>
      </div>
      <div style={{
        width: '100%',
        height: '10px',
        borderRadius: '999px',
        backgroundColor: '#2a2a2a',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${Math.min(percent, 100)}%`,
          height: '100%',
          backgroundColor: '#00e5a0',
          borderRadius: '999px',
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}