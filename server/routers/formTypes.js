// routes/formTypes.js
const express = require('express');
const router = express.Router();
const FormTypeController = require('../controllers/FormTypeController');
const autenticado = require('../middlewares/autenticado');

router.get('/', autenticado, FormTypeController.list);

module.exports = router;
