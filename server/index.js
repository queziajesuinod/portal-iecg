/* eslint consistent-return:0 import/order:0 */

const express = require('express');
const logger = require('./logger');
const favicon = require('serve-favicon');
const path = require('path');
const rawicons = require('./rawicons');
const rawdocs = require('./rawdocs');
const argv = require('./argv');
const port = require('./port');
const setup = require('./middlewares/frontendMiddleware'); // Mantendo o Middleware correto
const isDev = process.env.NODE_ENV !== 'production';
const ngrok = (isDev && process.env.ENABLE_TUNNEL) || argv.tunnel ? require('ngrok') : false;
const { resolve } = require('path');
const app = express();
const bodyParser = require('body-parser');

// 🛠️ Importando Rotas da API
const rotaUsers = require("./routers/users");
const rotaPerfil = require("./routers/perfis");
const rotaAuth = require("./routers/auth");
const rotaPermissao = require("./routers/permissao");
const aposentadoRoutes = require('./routers/aposentadoRoutes');

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(express.json()); // Middleware para processar JSON

// 🔹 Definir API Routes
app.use('/users', rotaUsers);
app.use('/perfil', rotaPerfil);
app.use('/auth', rotaAuth);
app.use('/permissoes', rotaPermissao);
app.use('/mia', aposentadoRoutes);

// 🔹 Servindo favicon (evita erro de arquivo não encontrado)
app.use(favicon(path.join(__dirname, '../public/favicons/favicon.ico')));


// 🔹 Servindo Arquivos Estáticos (Frontend React)
if (!isDev) {
  app.use(express.static(resolve(__dirname, '../build')));

  // Se nenhuma rota do backend for encontrada, retorna o `index.html` do React
  app.get('*', (req, res) => {
    res.sendFile(resolve(__dirname, '../build', 'index.html'));
  });
}

// 🔹 Middleware para carregar Material Icons e Documentação
app.use('/api/icons', (req, res) => {
  res.json({ records: [{ source: rawicons(req.query) }] });
});

app.use('/api/docs', (req, res) => {
  res.json({ records: [{ source: rawdocs(req.query) }] });
});

// 🔹 Middleware para frontend em desenvolvimento
setup(app, {
  outputPath: resolve(process.cwd(), 'build'),
  publicPath: '/',
});

// 🔹 Definição de host e porta
const customHost = argv.host || process.env.HOST;
const host = customHost || null;
const prettyHost = customHost || 'localhost';

// 🔹 Habilitando GZIP para arquivos JavaScript
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
