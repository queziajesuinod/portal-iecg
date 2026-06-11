const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const router = express.Router();
const controller = require('../controllers/liveQaAdminController');
const requirePermission = require('../middlewares/requirePermission');

// Acesso ao módulo: gerenciar OU moderar (admin total sempre passa)
router.use(requirePermission(['PERGUNTAS_AO_VIVO_GERENCIAR', 'PERGUNTAS_AO_VIVO_MODERAR']));

// Ações que só quem gerencia pode fazer (criar/editar/excluir salas, aparência)
const requireManage = requirePermission(['PERGUNTAS_AO_VIVO_GERENCIAR']);

// ===== Upload de imagem de fundo da tela ao vivo =====
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'qa');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase().slice(0, 8);
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const uploadBg = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpe?g|gif|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Arquivo deve ser uma imagem (png, jpg, gif ou webp)'));
  },
});

// ========== ROTAS ADMINISTRATIVAS DE Q&A AO VIVO (protegidas) ==========

const handleUpload = (req, res, next) => {
  uploadBg.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ erro: err.message });
    return next();
  });
};

// Upload de imagem (gerenciar)
router.post('/upload-bg', requireManage, handleUpload, controller.uploadBackground);

// Salas — leitura para ambos; criação/edição/exclusão só para quem gerencia
router.get('/sessions', controller.listarSalas);
router.post('/sessions', requireManage, controller.criarSala);
router.put('/sessions/:id', requireManage, controller.atualizarSala);
router.delete('/sessions/:id', requireManage, controller.excluirSala);

// Perguntas de uma sala — moderação liberada para ambos
router.get('/sessions/:id/questions', controller.listarPerguntas);
router.patch('/questions/:questionId', controller.moderarPergunta);
router.delete('/questions/:questionId', controller.excluirPergunta);

module.exports = router;
