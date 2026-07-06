import api from './api';

export const getTrustScore = async (userId) => {
  const result = await api.get(`/reputation/${userId}`);
  return result.data;
};

export const getMyTrustScore = async () => {
  const result = await api.get('/reputation');
  return result.data;
};