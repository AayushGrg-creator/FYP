import { useEffect, useState } from 'react';
import { getLeaderboard } from '../../services/gamificationService';
import LeaderboardTable from '../../components/gamification/LeaderboardTable';
import { useAuth } from '../../hooks/useAuth';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLeaderboard(50)
      .then(setRows)
      .catch((err) => setError(err.message || 'Failed to load leaderboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: '#9a9a9a', padding: '24px' }}>Loading leaderboard...</div>;
  if (error) return <div style={{ color: '#ff6b6b', padding: '24px' }}>{error}</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ fontFamily: 'DM Sans, sans-serif', color: '#ffffff', marginBottom: '16px' }}>
        Leaderboard
      </h2>
      <LeaderboardTable rows={rows} currentUserId={user?._id} />
    </div>
  );
}