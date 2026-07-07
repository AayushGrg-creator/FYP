import api from './api';

export const submitDispute = async ({ projectId, milestoneId, reason, description, evidence }) => {
  const result = await api.post('/disputes', { projectId, milestoneId, reason, description, evidence });
  return result.data;
};

export const getDisputeReport = async (disputeId) => {
  const result = await api.get(`/disputes/${disputeId}`);
  return result.data;
};

export const acceptDisputeResolution = async (disputeId) => {
  const result = await api.post(`/disputes/${disputeId}/accept`);
  return result.data;
};

export const getMyDisputes = async () => {
  const result = await api.get('/disputes/mine');
  return result.data;
};

export const getDisputeByMilestone = async (milestoneId) => {
  const result = await api.get(`/disputes/by-milestone/${milestoneId}`);
  return result.data;
};