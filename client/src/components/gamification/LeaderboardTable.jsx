import React from 'react';

export default function LeaderboardTable({ rows = [], currentUserId }) {
  return (
    <div style={{
      backgroundColor: '#1a1a1a',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #2a2a2a',
    }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
            {['#', 'User', 'Points', 'Badges', 'Trust'].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '12px 16px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  color: '#9a9a9a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isMe = row.userId === currentUserId;
            return (
              <tr
                key={row.userId}
                style={{
                  backgroundColor: isMe ? 'rgba(0, 229, 160, 0.08)' : 'transparent',
                  borderBottom: '1px solid #2a2a2a',
                }}
              >
                <td style={{ padding: '12px 16px', color: '#7c6ff7', fontFamily: 'DM Sans, sans-serif', fontWeight: 700 }}>
                  {index + 1}
                </td>
                <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {row.avatarUrl && (
                    <img
                      src={row.avatarUrl}
                      alt={row.name}
                      style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                    />
                  )}
                  <span style={{ fontFamily: 'DM Sans, sans-serif', color: '#ffffff', fontSize: '14px' }}>
                    {row.name}{isMe ? ' (You)' : ''}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#00e5a0', fontFamily: 'DM Sans, sans-serif', fontWeight: 600 }}>
                  {row.totalPoints}
                </td>
                <td style={{ padding: '12px 16px', color: '#ffffff', fontFamily: 'DM Sans, sans-serif' }}>
                  {row.badgeCount}
                </td>
                <td style={{ padding: '12px 16px', color: '#9a9a9a', fontFamily: 'DM Sans, sans-serif' }}>
                  {row.trustScore}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}