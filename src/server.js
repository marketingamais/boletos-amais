require('dotenv').config();
require('express-async-errors');

const express = require('express');
const app = express();

app.use(express.json());

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
