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
const jwt = require('jsonwebtoken'); // 🔐 Para validar o token
const isDev = process.env.NODE_ENV !== 'production';
const ngrok = (isDev && process.env.ENABLE_TUNNEL) || argv.tunnel ? require('ngrok') : false;
const { resolve } = require('path');
const app = express();
const bodyParser = require('body-parser');

// ✅ Middleware de autenticação JWT (Protege APIs)
const authMiddleware = (req, res, next) => {
  if (req.path.startsWith('/auth')) return next(); // Permite acesso à rota de login

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

// ✅ Configuração do CORS (Permite requisições do frontend)
app.use(cors({
  origin: ['https://portal.iecg.com.br', 'http://localhost:3001', 'http://0.0.0.0:3001'],
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));
app.options('*', cors());

// ✅ Middleware para processar JSON e formulários
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json());

// 🔓 **ROTA PÚBLICA** (Autenticação)
app.use('/auth', require("./routers/auth"));

// 🔒 **ROTAS PROTEGIDAS** (Exigem um token JWT válido)
app.use('/users', authMiddleware, require("./routers/users"));
app.use('/perfil', authMiddleware, require("./routers/perfis"));
app.use('/permissoes', authMiddleware, require("./routers/permissao"));
app.use('/mia', authMiddleware, require('./routers/aposentadoRoutes'));
app.use('/start', authMiddleware, require('./routers/startRoutes'));
app.use('/payments',authMiddleware, require('./routers/payments'));
app.use('/public', require('./routers/publicaForms'));
app.use('/forms',authMiddleware, require('./routers/forms'));
app.use('/public/payments', require('./routers/publicPayments'));
// 🔹 Carregar Material Icons e Documentação
app.use('/api/icons', (req, res) => {
  res.json({ records: [{ source: rawicons(req.query) }] });
});
app.use('/api/docs', (req, res) => {
  res.json({ records: [{ source: rawdocs(req.query) }] });
});

// 🔹 Servindo arquivos estáticos e favicon
app.use('/', express.static('public', { etag: false }));
app.use(favicon(path.join('public', 'favicons', 'favicon.ico')));

// 🔹 Mantendo o Frontend funcionando corretamente
setup(app, {
  outputPath: resolve(process.cwd(), 'build'),
  publicPath: '/',
});

// 🔹 Configuração de Host e Porta
const customHost = argv.host || process.env.HOST;
const host = customHost || null; // Permite IPv6/IPv4
const prettyHost = customHost || 'localhost';

// 🔹 Habilitando GZIP para otimizar carregamento do frontend
app.get('*.js', (req, res, next) => {
  req.url = req.url + '.gz';
  res.set('Content-Encoding', 'gzip');
  next();
});

// 🔥 Iniciando o Servidor
app.listen(port, host, async (err) => {
  if (err) {
    return logger.error(err.message);
  }

  // Conectar ao ngrok se estiver em modo desenvolvimento
  if (ngrok) {
    let url;
    try {
      url = await ngrok.connect(port);
      logger.info(`🔗 Ngrok rodando em: ${url}`);
    } catch (e) {
      return logger.error(e);
    }
    logger.appStarted(port, prettyHost, url);
  } else {
    logger.appStarted(port, prettyHost);
  }

  console.log(`🚀 Servidor rodando em: ${process.env.REACT_APP_API_URL}`);
});
