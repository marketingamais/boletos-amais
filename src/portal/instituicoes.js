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

  // Usa JS click para evitar "Node is either not clickable or not an Element"
  // que ocorre quando Puppeteer tenta mover o mouse ate um ElementHandle stale/coberto
  await frame.evaluate((idx) => {
    document.querySelectorAll('#tblContrato input[name="selBanco"]')[idx].click();
  }, indice);

  // Aguarda #btnAvancar ficar habilitado
  await frame.waitForFunction(
    () => !document.querySelector('#btnAvancar')?.disabled,
    { timeout: 5000 }
  );
  // frame.click() usa eventos de mouse completos (mousedown/mouseup/click) que o
  // portal precisa para disparar o AJAX; frame.evaluate/.click() nao e suficiente
  await frame.click('#btnAvancar');

  // Aguarda tabela de parcelas ser populada
  await frame.waitForSelector('#tblParcela tbody tr', { timeout: 15000 });
}

module.exports = { listarInstituicoes, selecionarInstituicao };
