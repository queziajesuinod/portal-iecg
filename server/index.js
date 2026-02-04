/* eslint consistent-return:0 import/order:0 */

const express = require('express');
const logger = require('./logger');
const favicon = require('serve-favicon');
const path = require('path');
const rawicons = require('./rawicons');
const rawdocs = require('./rawdocs');
const argv = require('./argv');
const port = require('./port');
const setup = require('./middlewares/frontendMiddleware');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const isDev = process.env.NODE_ENV !== 'production';
const ngrok = (isDev && process.env.ENABLE_TUNNEL) || argv.tunnel ? require('ngrok') : false;
const { resolve } = require('path');
const app = express();
const bodyParser = require('body-parser');
const WebhookController = require('./controllers/webhookController');
const pixPendingJob = require('./jobs/pixPendingRegistrationsJob');
const singlePaymentStatusJob = require('./jobs/singlePaymentStatusSyncJob');
const customHost = argv.host || process.env.HOST;
const host = customHost || null; // Permite IPv6/IPv4
const prettyHost = customHost || 'localhost';

// Middleware de autenticação JWT (protege as APIs)
const authMiddleware = (req, res, next) => {
  if (req.path.startsWith('/auth')) return next(); // permite login

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Acesso negado. Nenhum token fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido.' });
  }
};

// CORS
app.use(cors({
  origin: ['https://portal.iecg.com.br', 'http://localhost:3005', 'http://0.0.0.0:3005', 'http://localhost:3007', 'http://localhost:3000'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
app.options('*', cors());

// Body parsers
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json());

// Rotas públicas
app.use('/auth', require('./routers/auth'));
app.post('/webhooks/events', WebhookController.sendEvent);
// Rotas protegidas
app.use('/users', authMiddleware, require('./routers/users'));
app.use('/perfil', authMiddleware, require('./routers/perfis'));
app.use('/permissoes', authMiddleware, require('./routers/permissao'));
app.use('/mia', authMiddleware, require('./routers/aposentadoRoutes'));
app.use('/start', authMiddleware, require('./routers/startRoutes'));
app.use('/webhooks', authMiddleware, require('./routers/webhooks'));

// ============= MÓDULO DE EVENTOS =============
// Rotas públicas de eventos e inscrições (DEVE VIR ANTES DE /public genérico)
app.use('/api/public/events', require('./routers/publicEventRoutes'));
// Rota pública para apelos direcionados
app.use('/public', require('./routers/publicStartRoutes'));
// Rotas administrativas de eventos (protegidas)
app.use('/api/admin/events', authMiddleware, require('./routers/eventRoutes'));
// Webhook Cielo (pública - sem autenticação)
app.use('/api/webhooks', require('./routers/webhookRoutes'));

// Assets utilitários
app.use('/api/icons', (req, res) => {
  res.json({ records: [{ source: rawicons(req.query) }] });
});
app.use('/api/docs', (req, res) => {
  res.json({ records: [{ source: rawdocs(req.query) }] });
});

// Estáticos
app.use('/', express.static('public', { etag: false }));
app.use(favicon(path.join('public', 'favicons', 'favicon.ico')));

// Frontend
setup(app, {
  outputPath: resolve(process.cwd(), 'build'),
  publicPath: '/',
});

// GZIP para JS
app.get('*.js', (req, res, next) => {
  req.url = `${req.url}.gz`;
  res.set('Content-Encoding', 'gzip');
  next();
});

// Iniciar servidor
app.listen(port, host, async (err) => {
  if (err) {
    return logger.error(err.message);
  }

  if (ngrok) {
    let url;
    try {
      url = await ngrok.connect(port);
      logger.info(`Ngrok rodando em: ${url}`);
    } catch (e) {
      return logger.error(e);
    }
    logger.appStarted(port, prettyHost, url);
  } else {
    logger.appStarted(port, prettyHost);
  }

  pixPendingJob.startPixPendingJob();
  singlePaymentStatusJob.startSinglePaymentStatusJob();

  console.log(`Servidor rodando em: ${process.env.REACT_APP_API_URL}`);
});
