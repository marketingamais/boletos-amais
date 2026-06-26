const { Router } = require('express');
const { criarSessao, obterSessao, encerrarSessao } = require('../src/sessionManager');
const { login, obterFrame } = require('../src/portal/login');
const { listarInstituicoes, selecionarInstituicao } = require('../src/portal/instituicoes');
const { selecionarTodasParcelas } = require('../src/portal/parcelas');
const { lerCondicao } = require('../src/portal/condicao');

const router = Router();

// POST /sessao/iniciar
router.post('/sessao/iniciar', async (req, res) => {
  const { cpf } = req.body;
  if (!cpf) return res.status(400).json({ sucesso: false, erro: 'CPF obrigatório.' });

  let sessionId;
  try {
    const criada = await criarSessao();
    sessionId = criada.sessionId;
    const { page, sessao } = criada;

    // Login retorna o frame (iframe do portal)
    const frame = await login(page, cpf);
    sessao.frame = frame;

    const instituicoes = await listarInstituicoes(frame);

    if (instituicoes.length === 0) {
      await encerrarSessao(sessionId);
      return res.status(404).json({ sucesso: false, erro: 'Nenhuma dívida encontrada para este CPF.' });
    }

    // Uma única instituição: avança automaticamente até a condição.
    // Cada etapa renavega o iframe e devolve o frame da tela seguinte.
    if (instituicoes.length === 1) {
      const frameParcelas = await selecionarInstituicao(frame, page, 0);
      const { parcelas, frame: frameCondicao } = await selecionarTodasParcelas(frameParcelas, page);
      const { valor, vencimento } = await lerCondicao(frameCondicao);
      sessao.frame = frameCondicao;

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
  } catch (err) {
    // Garante que o browser nao vaze se algo falhar no meio do fluxo
    if (sessionId) await encerrarSessao(sessionId).catch(() => {});
    return res.status(500).json({ sucesso: false, erro: err.message || 'Falha ao iniciar sessão.' });
  }
});

// POST /sessao/:id/selecionar-instituicao
router.post('/sessao/:id/selecionar-instituicao', async (req, res) => {
  const { id } = req.params;
  const { indice } = req.body;

  try {
    const sessao = obterSessao(id);
    const { page } = sessao;

    // Re-adquire o frame: a referencia salva em sessao.frame pode ficar stale
    // entre a chamada de /iniciar e esta, dependendo do tempo de resposta do usuario
    const frame = await obterFrame(page);
    sessao.frame = frame;

    const instituicoes = await listarInstituicoes(frame);
    const frameParcelas = await selecionarInstituicao(frame, page, indice);
    const { parcelas, frame: frameCondicao } = await selecionarTodasParcelas(frameParcelas, page);
    const { valor, vencimento } = await lerCondicao(frameCondicao);
    sessao.frame = frameCondicao;

    res.json({ instituicao: instituicoes[indice]?.nome || '', valorTotal: valor, vencimento, parcelas });
  } catch (err) {
    return res.status(500).json({ sucesso: false, erro: err.message || 'Falha ao selecionar instituição.' });
  }
});

// DELETE /sessao/:id
router.delete('/sessao/:id', async (req, res) => {
  await encerrarSessao(req.params.id);
  res.json({ encerrada: true });
});

module.exports = router;
