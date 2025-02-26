const {Router} = require("express")
const router = Router()
const express = require('express');
const {getUsers,postUsers,getUserDetalhe,postLogin} = require("../controllers/users")
const autenticado = require('../middlewares/autenticado')

//router.use(autenticado)



// Configurar para aceitar JSON
router.use(express.json());
router.get('/', getUsers)
router.get('/:id', getUserDetalhe)
router.post('/', postUsers)

module.exports= router
