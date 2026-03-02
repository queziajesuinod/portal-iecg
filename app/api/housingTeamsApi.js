import axios from 'axios';

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
const BASE = `${API_URL}/api/admin/events`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const request = (method, url, data) => axios({
  method,
  url,
  data,
  headers: getAuthHeader()
}).then((response) => response.data);

export const getHousingConfig = (eventId) => request('get', `${BASE}/${eventId}/housing/config`);
export const getHousingAvailableFields = (eventId) => request('get', `${BASE}/${eventId}/housing/available-fields`);

export const saveHousingConfig = (eventId, data) => request('post', `${BASE}/${eventId}/housing/config`, data);

export const generateHousingAllocation = (eventId, customRules = '') => request('post', `${BASE}/${eventId}/housing/generate`, { customRules });

export const getHousingAllocation = (eventId) => request('get', `${BASE}/${eventId}/housing/allocation`);

export const saveHousingAllocation = (eventId, allocation, reasoning = '') => request('put', `${BASE}/${eventId}/housing/allocation`, { allocation, reasoning });

export const getEventBatches = (eventId) => request('get', `${BASE}/${eventId}/batches`);

export const getTeamsConfig = (eventId) => request('get', `${BASE}/${eventId}/teams/config`);
export const getTeamsAvailableFields = (eventId) => request('get', `${BASE}/${eventId}/teams/available-fields`);

export const saveTeamsConfig = (eventId, data) => request('post', `${BASE}/${eventId}/teams/config`, data);

export const generateTeamsAllocation = (eventId, customRules = '') => request('post', `${BASE}/${eventId}/teams/generate`, { customRules });

export const getTeamsAllocation = (eventId) => request('get', `${BASE}/${eventId}/teams/allocation`);

export const saveTeamsAllocation = (eventId, allocation, reasoning = '') => request('put', `${BASE}/${eventId}/teams/allocation`, { allocation, reasoning });
