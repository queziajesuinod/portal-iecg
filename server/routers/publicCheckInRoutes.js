const express = require('express');
const router = express.Router();
const checkInController = require('../controllers/checkInController');

// ========== ROTAS PÚBLICAS (sem autenticação) ==========

// Check-in via QR Code
router.post('/qrcode', checkInController.realizarCheckInQRCode);

// Check-in via NFC
router.post('/nfc', checkInController.realizarCheckInNFC);

// Validar código de inscrição
router.get('/validate/:orderCode', checkInController.validarCodigo);

module.exports = router;
