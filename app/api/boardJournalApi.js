import { fetchWithAuth } from 'utils/authSession';

const resolveApiUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  const { protocol, hostname, port } = window.location;
  if (port === '3005') {
    return `${protocol}//${hostname}:3005`;
  }
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

const API_URL = resolveApiUrl();
const BASE = `${API_URL}/api/admin/diario-bordo`;

const withQuery = (path, params = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value === undefined || value === null || value === '') {
        return acc;
      }
      acc[key] = value;
      return acc;
    }, {})
  ).toString();

  return `${BASE}${path}${query ? `?${query}` : ''}`;
};

export const listBoardJournals = (params = {}) => fetchWithAuth(withQuery('/journals', params));
export const getBoardJournal = (journalId) => fetchWithAuth(`${BASE}/journals/${journalId}`);
export const createBoardJournal = (data) => fetchWithAuth(`${BASE}/journals`, { method: 'POST', body: JSON.stringify(data) });
export const updateBoardJournal = (journalId, data) => fetchWithAuth(`${BASE}/journals/${journalId}`, { method: 'PUT', body: JSON.stringify(data) });
export const listSystemUsers = () => fetchWithAuth(`${API_URL}/users`);
export const requestBoardJournalAccess = (journalId, note) => fetchWithAuth(`${BASE}/journals/${journalId}/request-access`, { method: 'POST', body: JSON.stringify({ note }) });
export const listBoardJournalMembers = (journalId) => fetchWithAuth(`${BASE}/journals/${journalId}/members`);
export const approveBoardJournalMember = (journalId, memberId, note) => fetchWithAuth(`${BASE}/journals/${journalId}/members/${memberId}/approve`, { method: 'PUT', body: JSON.stringify({ note }) });
export const rejectBoardJournalMember = (journalId, memberId, note) => fetchWithAuth(`${BASE}/journals/${journalId}/members/${memberId}/reject`, { method: 'PUT', body: JSON.stringify({ note }) });
export const deleteBoardJournalMember = (journalId, memberId) => fetchWithAuth(`${BASE}/journals/${journalId}/members/${memberId}`, { method: 'DELETE' });

export const listBoardCategories = (journalId) => fetchWithAuth(withQuery('/categories', { journalId }));
export const createBoardCategory = (data) => fetchWithAuth(`${BASE}/categories`, { method: 'POST', body: JSON.stringify(data) });
export const updateBoardCategory = (id, data) => fetchWithAuth(`${BASE}/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBoardCategory = (id) => fetchWithAuth(`${BASE}/categories/${id}`, { method: 'DELETE' });

export const listBoardChallenges = (params = {}) => fetchWithAuth(withQuery('/challenges', params));
export const getBoardChallenge = (id) => fetchWithAuth(`${BASE}/challenges/${id}`);
export const createBoardChallenge = (data) => fetchWithAuth(`${BASE}/challenges`, { method: 'POST', body: JSON.stringify(data) });
export const updateBoardChallenge = (id, data) => fetchWithAuth(`${BASE}/challenges/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBoardChallenge = (id) => fetchWithAuth(`${BASE}/challenges/${id}`, { method: 'DELETE' });

export const listMyBoardSubmissions = (journalId) => fetchWithAuth(withQuery('/submissions/me', { journalId }));
export const createBoardSubmission = (data) => fetchWithAuth(`${BASE}/submissions`, { method: 'POST', body: JSON.stringify(data) });
export const listPendingBoardSubmissions = (params = {}) => fetchWithAuth(withQuery('/submissions/pending', params));
export const listBoardSubmissionsByChallenge = (challengeId) => fetchWithAuth(`${BASE}/submissions/challenge/${challengeId}`);
export const approveBoardSubmission = (id, feedback) => fetchWithAuth(`${BASE}/submissions/${id}/approve`, { method: 'PUT', body: JSON.stringify({ feedback }) });
export const rejectBoardSubmission = (id, feedback) => fetchWithAuth(`${BASE}/submissions/${id}/reject`, { method: 'PUT', body: JSON.stringify({ feedback }) });

export const listBoardBadges = (journalId) => fetchWithAuth(withQuery('/badges', { journalId }));
export const listMyBoardBadges = (journalId) => fetchWithAuth(withQuery('/badges/me', { journalId }));
export const createBoardBadge = (data) => fetchWithAuth(`${BASE}/badges`, { method: 'POST', body: JSON.stringify(data) });
export const updateBoardBadge = (id, data) => fetchWithAuth(`${BASE}/badges/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteBoardBadge = (id) => fetchWithAuth(`${BASE}/badges/${id}`, { method: 'DELETE' });

export const getBoardStats = (journalId) => fetchWithAuth(withQuery('/analytics/stats', { journalId }));
export const getBoardRanking = (params = {}) => fetchWithAuth(withQuery('/analytics/ranking', params));
export const getMyBoardStats = (journalId) => fetchWithAuth(withQuery('/analytics/me', { journalId }));
export const getBoardUserStats = (userId, journalId) => fetchWithAuth(withQuery(`/analytics/user/${userId}`, { journalId }));
export const getBoardChallengeStats = (challengeId) => fetchWithAuth(`${BASE}/analytics/challenge/${challengeId}`);
