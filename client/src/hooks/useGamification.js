import { useState, useEffect, useCallback } from 'react';
import {
  getMyProgress,
  getLeaderboard,
  getAllBadges,
  getMyBadges,
} from '../services/gamificationService';

export default function useGamification() {
  const [progress, setProgress] = useState(null);
  const [myBadges, setMyBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCore = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [progressData, myBadgesData, allBadgesData] = await Promise.all([
        getMyProgress(),
        getMyBadges(),
        getAllBadges(),
      ]);
      setProgress(progressData);
      setMyBadges(myBadgesData);
      setAllBadges(allBadgesData);
    } catch (err) {
      setError(err.message || 'Failed to load gamification data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async (limit, category) => {
    try {
      const data = await getLeaderboard(limit, category);
      setLeaderboard(data);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
      return [];
    }
  }, []);

  useEffect(() => {
    loadCore();
  }, [loadCore]);

  return { progress, myBadges, allBadges, leaderboard, loading, error, refresh: loadCore, fetchLeaderboard };
}