const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');

// ========== ROTAS PÚBLICAS (sem autenticação) ==========

// Configuracao publica para app/kiosk de check-in
router.get('/events/:eventId/config', checkInController.obterConfiguracaoPublica);

// Check-in via QR Code
router.post('/qrcode', checkInController.realizarCheckInQRCode);

// Check-in via NFC
router.post('/nfc', checkInController.realizarCheckInNFC);

// Validar código de inscrição
router.get('/validate/:orderCode', checkInController.validarCodigo);

module.exports = router;
