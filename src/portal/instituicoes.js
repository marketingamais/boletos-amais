const { avancarEAguardar } = require('./helpers');

async function listarInstituicoes(frame) {
  await frame.waitForSelector('#tblContrato tbody tr');

  return frame.evaluate(() =>
    [...document.querySelectorAll('#tblContrato tbody tr')].map((tr, indice) => ({
      indice,
      nome: tr.querySelector('td:nth-child(2)')?.textContent?.trim() || '',
      status: tr.querySelector('td:nth-child(3) span')?.textContent?.trim() || '',
      banco: tr.querySelector('input[name="selBanco"]')?.dataset?.banco || '',
    }))
  );
}

// Seleciona a instituicao pelo indice e avanca.
// - Divida "Aberta": cai na tela de parcelas (#tblParcela).
// - Divida "Negociada": o portal pula direto para a tela de boleto/acompanhamento
//   (#tblAcompanhamento), sem parcelas nem condicao.
// Retorna o frame da nova tela (o iframe renavega ao avancar).
async function selecionarInstituicao(frame, page, indice, ehNegociada = false) {
  const count = await frame.evaluate(() =>
    document.querySelectorAll('#tblContrato input[name="selBanco"]').length
  );
  if (indice >= count) throw new Error(`Instituição no índice ${indice} não encontrada (total: ${count}).`);

  // Seleciona o radio via JS (funciona mesmo fora da viewport)
  await frame.evaluate((idx) => {
    const radio = document.querySelectorAll('#tblContrato input[name="selBanco"]')[idx];
    radio.scrollIntoView({ block: 'center' });
    radio.click();
  }, indice);

  // Aguarda #btnAvancar ficar habilitado
  await frame.waitForFunction(
    () => !document.querySelector('#btnAvancar')?.disabled,
    { timeout: 5000 }
  );

  // Avanca e re-adquire o frame ja na tela seguinte
  const esperaSelector = ehNegociada ? '#tblAcompanhamento tbody tr' : '#tblParcela tbody tr';
  return avancarEAguardar(frame, page, '#btnAvancar', esperaSelector, {
    timeoutPorTentativa: 10000,
  });
}

module.exports = { listarInstituicoes, selecionarInstituicao };
