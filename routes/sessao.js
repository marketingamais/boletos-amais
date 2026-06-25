const { Router } = require('express');
const { criarSessao, obterSessao, encerrarSessao } = require('../src/sessionManager');
const { login } = require('../src/portal/login');
const { listarInstituicoes, selecionarInstituicao } = require('../src/portal/instituicoes');
const { selecionarTodasParcelas } = require('../src/portal/parcelas');
const { lerCondicao } = require('../src/portal/condicao');

const router = Router();

// POST /sessao/iniciar
router.post('/sessao/iniciar', async (req, res) => {
  const { cpf } = req.body;
  if (!cpf) return res.status(400).json({ erro: 'CPF obrigatório.' });

  const { sessionId, page, sessao } = await criarSessao();

  // Login retorna o frame (iframe do portal)
  const frame = await login(page, cpf);
  sessao.frame = frame;

  const instituicoes = await listarInstituicoes(frame);

  if (instituicoes.length === 0) {
    await encerrarSessao(sessionId);
    return res.status(404).json({ erro: 'Nenhuma dívida encontrada para este CPF.' });
  }

  // Uma única instituição: avança automaticamente até a condição
  if (instituicoes.length === 1) {
    await selecionarInstituicao(frame, 0);
    const parcelas = await selecionarTodasParcelas(frame, page);
    const { valor, vencimento } = await lerCondicao(frame);

    return res.json({
      sessionId,
      instituicao: instituicoes[0].nome,
      valorTotal: valor,
      vencimento,
      parcelas,
    });
  }

  // Múltiplas: pausa para o N8N perguntar ao usuário
  return res.json({ sessionId, aguardandoEscolha: true, instituicoes });
});

// POST /sessao/:id/selecionar-instituicao
router.post('/sessao/:id/selecionar-instituicao', async (req, res) => {
  const { id } = req.params;
  const { indice } = req.body;
  const sessao = obterSessao(id);
  const { page, frame } = sessao;

  const instituicoes = await listarInstituicoes(frame);
  await selecionarInstituicao(frame, indice);
  const parcelas = await selecionarTodasParcelas(frame, page);
  const { valor, vencimento } = await lerCondicao(frame);

  res.json({ instituicao: instituicoes[indice]?.nome || '', valorTotal: valor, vencimento, parcelas });
});

// DELETE /sessao/:id
router.delete('/sessao/:id', async (req, res) => {
  await encerrarSessao(req.params.id);
  res.json({ encerrada: true });
});

module.exports = router;
