require('dotenv').config();
require('express-async-errors');

const express = require('express');
const app = express();

app.use(express.json());

// Autenticação por API Key (exceto /health)
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const apiKey = process.env.API_KEY;
  if (apiKey && req.headers['x-api-key'] !== apiKey) {
    return res.status(401).json({ sucesso: false, erro: 'Não autorizado' });
  }
  next();
});

app.use(require('../routes/health'));
app.use(require('../routes/sessao'));
app.use(require('../routes/confirmar'));

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error(`[ERRO] ${err.message}`);
  res.status(500).json({ sucesso: false, erro: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Puppeteer service rodando na porta ${PORT}`);
});
