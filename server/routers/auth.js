const {Router} = require('express')
const AuthController = require('../controllers/auth')
const router = Router()
const express = require('express');


// Configurar para aceitar JSON
router.use(express.json());
router.post('/login', AuthController.login)


module.exports = router