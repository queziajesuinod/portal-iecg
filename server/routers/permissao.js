const {Router} = require("express")
const router = Router()
const PermissaoController = require('../controllers/permissao')


router.get('/', PermissaoController.buscarTodasPermissoes)
router.get('/:id',PermissaoController.buscarPermissaoPorId)
router.post('/',PermissaoController.cadastrar)

module.exports= router
