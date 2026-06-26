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

// Seleciona a instituicao pelo indice e avanca para a tela de parcelas.
// Retorna o frame da nova tela (o iframe renavega ao avancar).
async function selecionarInstituicao(frame, page, indice) {
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

  // Avanca e re-adquire o frame ja na tela de parcelas
  return avancarEAguardar(frame, page, '#btnAvancar', '#tblParcela tbody tr', {
    timeoutPorTentativa: 10000,
  });
}

module.exports = { listarInstituicoes, selecionarInstituicao };
