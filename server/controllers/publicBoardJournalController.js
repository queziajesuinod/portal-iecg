'use strict';

const boardJournalService = require('../services/boardJournalService');

async function getAnswered(req, res) {
  try {
    const { email, journalId } = req.query;
    if (!email) return res.status(400).json({ message: 'Email e obrigatorio' });
    if (!journalId) return res.status(400).json({ message: 'journalId e obrigatorio' });
    const data = await boardJournalService.getPublicAnsweredByEmail(email, journalId);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Erro ao listar respostas' });
  }
}

async function getPending(req, res) {
  try {
    const { email, journalId } = req.query;
    if (!email) return res.status(400).json({ message: 'Email e obrigatorio' });
    if (!journalId) return res.status(400).json({ message: 'journalId e obrigatorio' });
    const data = await boardJournalService.getPublicPendingByEmail(email, journalId);
    return res.status(200).json(data);
  } catch (error) {
    const status = error.statusCode === 403 ? 403 : 400;
    return res.status(status).json({ message: error.message || 'Erro ao listar perguntas pendentes' });
  }
}

async function createChallenge(req, res) {
  try {
    const data = await boardJournalService.createPublicChallenge(req.body);
    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Erro ao criar pergunta' });
  }
}

async function createSubmission(req, res) {
  try {
    const data = await boardJournalService.createPublicSubmission(req.body);
    return res.status(201).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || 'Erro ao enviar resposta' });
  }
}

module.exports = {
  getAnswered, getPending, createChallenge, createSubmission
};
