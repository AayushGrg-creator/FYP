import api from './api';

export const getMyProgress = async () => {
  const result = await api.get('/gamification/progress');
  return result.data;
};

export const getLeaderboard = async (limit = 100, category) => {
  const params = { limit };
  if (category) params.category = category;
  const result = await api.get('/gamification/leaderboard', { params });
  return result.data;
};

export const getAllBadges = async () => {
  const result = await api.get('/gamification/badges');
  return result.data;
};

export const getMyBadges = async () => {
  const result = await api.get('/gamification/my-badges');
  return result.data;
};