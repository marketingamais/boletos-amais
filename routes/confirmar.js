const { Router } = require('express');
const { obterSessao, encerrarSessao } = require('../src/sessionManager');
const { confirmarAVista } = require('../src/portal/condicao');
const { preencherDados } = require('../src/portal/dados');
const { gerarBoleto, verificarBoletoDisponivel } = require('../src/portal/boleto');

const router = Router();

// POST /sessao/:id/confirmar
router.post('/sessao/:id/confirmar', async (req, res) => {
  const { id } = req.params;
  const { email, telefone1, telefone2, endereco, bairro, cidade, uf, cep } = req.body;

  const camposObrigatorios = { email, telefone1, endereco, bairro, cidade, uf, cep };
  const faltando = Object.entries(camposObrigatorios).filter(([, v]) => !v).map(([k]) => k);
  if (faltando.length > 0) {
    return res.status(400).json({ erro: `Campos obrigatórios ausentes: ${faltando.join(', ')}` });
  }

  const sessao = obterSessao(id);
  const { page, frame } = sessao;

  await confirmarAVista(frame);
  const { nomeAluno } = await preencherDados(frame, { email, telefone1, telefone2, endereco, bairro, cidade, uf, cep });

  const boletoDisponivel = await verificarBoletoDisponivel(frame);

  if (!boletoDisponivel) {
    await encerrarSessao(id);
    const primeiroNome = nomeAluno.split(' ')[0] || nomeAluno;
    return res.json({
      sucesso: true,
      tipoBoleto: 'email',
      mensagem: `Perfeito, ${primeiroNome}! Já lançamos a sua negociação em nosso portal e em breve o boleto chegará no seu e-mail. Obrigado!`,
    });
  }

  const { pdfBase64, linhaDigitavel } = await gerarBoleto(page, frame);
  await encerrarSessao(id);

  res.json({ sucesso: true, tipoBoleto: 'boleto', linhaDigitavel, pdfBase64 });
});

module.exports = router;
