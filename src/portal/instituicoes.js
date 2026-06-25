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
  const radios = await frame.$$('#tblContrato input[name="selBanco"]');
  if (!radios[indice]) throw new Error(`Instituição no índice ${indice} não encontrada.`);
  await radios[indice].click();

  // Aguarda #btnAvancar ficar habilitado
  await frame.waitForFunction(
    () => !document.querySelector('#btnAvancar')?.disabled,
    { timeout: 5000 }
  );
  await frame.click('#btnAvancar');

  // Aguarda tabela de parcelas ser populada
  await frame.waitForSelector('#tblParcela tbody tr', { timeout: 15000 });
}

module.exports = { listarInstituicoes, selecionarInstituicao };
