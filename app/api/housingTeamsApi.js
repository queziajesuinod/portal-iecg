/**
 * housingTeamsApi.js
 * Funções axios para os módulos de Hospedagem e Times.
 * Seguindo o padrão do projeto (igual eventsApi.js).
 */

import axios from 'axios';

const BASE = '/api/events';

// ─── HOSPEDAGEM ───────────────────────────────────────────────────────────────

export const getHousingConfig = (eventId) =>
  axios.get(`${BASE}/${eventId}/housing/config`).then((r) => r.data);

export const saveHousingConfig = (eventId, data) =>
  axios.post(`${BASE}/${eventId}/housing/config`, data).then((r) => r.data);

export const generateHousingAllocation = (eventId, customRules = '') =>
  axios
    .post(`${BASE}/${eventId}/housing/generate`, { customRules })
    .then((r) => r.data);

export const getHousingAllocation = (eventId) =>
  axios.get(`${BASE}/${eventId}/housing/allocation`).then((r) => r.data);

export const saveHousingAllocation = (eventId, allocation, reasoning = '') =>
  axios
    .put(`${BASE}/${eventId}/housing/allocation`, { allocation, reasoning })
    .then((r) => r.data);

// ─── TIMES ────────────────────────────────────────────────────────────────────

export const getTeamsConfig = (eventId) =>
  axios.get(`${BASE}/${eventId}/teams/config`).then((r) => r.data);

export const saveTeamsConfig = (eventId, data) =>
  axios.post(`${BASE}/${eventId}/teams/config`, data).then((r) => r.data);

export const generateTeamsAllocation = (eventId, customRules = '') =>
  axios
    .post(`${BASE}/${eventId}/teams/generate`, { customRules })
    .then((r) => r.data);

export const getTeamsAllocation = (eventId) =>
  axios.get(`${BASE}/${eventId}/teams/allocation`).then((r) => r.data);

export const saveTeamsAllocation = (eventId, allocation, reasoning = '') =>
  axios
    .put(`${BASE}/${eventId}/teams/allocation`, { allocation, reasoning })
    .then((r) => r.data);
