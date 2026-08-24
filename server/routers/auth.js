const { Router } = require('express');
const express = require('express');
const AuthController = require('../controllers/auth');
const router = Router();

// Configurar para aceitar JSON
router.use(express.json());
// Rate limit aplicado no mount /auth (index.js) cobre login e recuperação de senha.
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);

module.exports = router;
