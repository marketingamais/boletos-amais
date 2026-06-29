const { Router } = require('express');
const { criarSessao, obterSessao, encerrarSessao } = require('../src/sessionManager');
const { login, obterFrame, obterNomeCliente } = require('../src/portal/login');
const { listarInstituicoes, selecionarInstituicao } = require('../src/portal/instituicoes');
const { selecionarTodasParcelas } = require('../src/portal/parcelas');
const { lerCondicao } = require('../src/portal/condicao');
const { lerAcompanhamento, gerarBoleto } = require('../src/portal/boleto');

const router = Router();

// Seleciona a instituicao e resolve o fluxo conforme o status da divida:
// - "Negociada": ja existe acordo. Le valor/vencimento do acordo e baixa o boleto
//   existente para extrair a linha digitavel. Retorna { jaNegociada: true, ... }.
// - "Aberta": segue o fluxo normal (parcelas -> condicao). Retorna o frame da
//   condicao em `frame` para as proximas etapas (/confirmar).
async function resolverInstituicao(page, frame, instituicoes, indice) {
  const alvo = instituicoes[indice];
  const ehNegociada = /negociad/i.test(alvo?.status || '');

  const frameProx = await selecionarInstituicao(frame, page, indice, ehNegociada);

  if (ehNegociada) {
    const { valorTotal, vencimento } = await lerAcompanhamento(frameProx);
    const { linhaDigitavel } = await gerarBoleto(page, frameProx);
    return {
      jaNegociada: true,
      instituicao: alvo?.nome || '',
      valorTotal,
      vencimento,
      linhaDigitavel,
    };
  }

  const { parcelas, frame: frameCondicao } = await selecionarTodasParcelas(frameProx, page);
  const { valor, vencimento } = await lerCondicao(frameCondicao);
  return {
    jaNegociada: false,
    instituicao: alvo?.nome || '',
    valorTotal: valor,
    vencimento,
    parcelas,
    frame: frameCondicao,
  };
}

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

    // Nome do cliente (best-effort, via modal de Perfil). Primeiro nome para
    // a personalizacao da conversa; '' se nao houver cadastro.
    const nomeCompleto = await obterNomeCliente(frame);
    const nomeCliente = nomeCompleto ? nomeCompleto.split(' ')[0] : '';
    sessao.nomeCliente = nomeCliente;

    const instituicoes = await listarInstituicoes(frame);

    if (instituicoes.length === 0) {
      await encerrarSessao(sessionId);
      return res.status(404).json({ sucesso: false, erro: 'Nenhuma dívida encontrada para este CPF.' });
    }

    // Inventario puro: SEMPRE retorna a lista completa de instituicoes com seu
    // status (Aberta/Negociada), sem resolver nem fechar a sessao. O agente
    // recebe o panorama atual e decide o proximo passo (selecionar-instituicao).
    // A sessao fica viva na tela da lista de contratos (sessao.frame ja salvo).
    return res.json({ sessionId, nomeCliente, instituicoes });
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
    const { frame: frameResultado, ...resultado } = await resolverInstituicao(page, frame, instituicoes, indice);

    // Divida ja negociada: entrega o boleto existente e encerra a sessao
    if (resultado.jaNegociada) {
      await encerrarSessao(id);
      return res.json(resultado);
    }

    sessao.frame = frameResultado;
    res.json(resultado);
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
