const { clicarBotao } = require('./helpers');

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

async function selecionarInstituicao(frame, indice) {
  const count = await frame.evaluate(() =>
    document.querySelectorAll('#tblContrato input[name="selBanco"]').length
  );
  if (indice >= count) throw new Error(`Instituição no índice ${indice} não encontrada (total: ${count}).`);

  // Seleciona o radio via JS (funciona mesmo fora da viewport, sem o check de
  // clickability do Puppeteer)
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
  // clicarBotao rola ate o botao e usa eventos de mouse reais (necessarios para o AJAX)
  await clicarBotao(frame, '#btnAvancar');

  // Aguarda tabela de parcelas ser populada
  await frame.waitForSelector('#tblParcela tbody tr', { timeout: 15000 });
}

module.exports = { listarInstituicoes, selecionarInstituicao };
