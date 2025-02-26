const {Router} = require("express")
const router = Router()
const express = require('express');
const {getPerfilDetalhe,postPerfil,getPerfils} = require("../controllers/perfis")
const autenticado = require('../middlewares/autenticado')
//router.use(autenticado)


// Configurar para aceitar JSON
router.use(express.json());
router.get('/', getPerfils)
router.get('/:id', getPerfilDetalhe)
router.post('/', postPerfil)

module.exports= router
