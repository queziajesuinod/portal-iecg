const express = require('express');
const router = express.Router();
const FormController = require('../controllers/formController');

router.get('/forms/:slug', FormController.getFormBySlug);

module.exports = router;