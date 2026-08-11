const { Router } = require('express');
const controller = require('../controllers/publicVoluntariadoController');

const router = Router();

// GET /api/public/voluntariado/areas — lista áreas ativas
router.get('/areas', controller.listarAreas);

// GET /api/public/voluntariado/campus — lista campus ativos
router.get('/campus', controller.listarCampus);

// GET /api/public/voluntariado/campus/:campusId/ministerios — lista ministérios do campus
router.get('/campus/:campusId/ministerios', controller.listarMinisteriosPorCampus);

// GET /api/public/voluntariado/membro?email=&cpf= — busca membro existente (pré-preenche)
router.get('/membro', controller.buscarMembro);

// POST /api/public/voluntariado/pessoa — etapa 1: cria/atualiza a pessoa (retorna memberId)
router.post('/pessoa', controller.salvarPessoa);

// POST /api/public/voluntariado/vinculo — etapa 2: adiciona UMA área de voluntariado
router.post('/vinculo', controller.adicionarVinculo);

// POST /api/public/voluntariado — cadastra voluntário (fluxo antigo, retrocompatível)
router.post('/', controller.cadastrarVoluntario);

module.exports = router;
