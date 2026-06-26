const { clicarBotao } = require('./helpers');

async function selecionarTodasParcelas(frame, page) {
  await frame.waitForSelector('#tblParcela tbody tr');

  const linhas = await frame.$$('#tblParcela tbody tr');
  if (linhas.length === 0) throw new Error('Nenhuma parcela encontrada.');

  // Coleta dados antes de clicar
  const parcelas = await frame.evaluate(() =>
    [...document.querySelectorAll('#tblParcela tbody tr')].map(tr => ({
      numero: tr.querySelector('td:nth-child(1)')?.textContent?.trim() || '',
      valor: tr.querySelector('td:nth-child(2)')?.textContent?.trim() || '',
      vencimento: tr.querySelector('td:nth-child(3)')?.textContent?.trim() || '',
    }))
  );

  // Clica na primeira linha (rola ate ela antes, evitando "not clickable")
  await linhas[0].scrollIntoViewIfNeeded?.().catch(() => {});
  await linhas[0].click();

  // SHIFT+click na última para selecionar todas
  if (linhas.length > 1) {
    await linhas[linhas.length - 1].scrollIntoViewIfNeeded?.().catch(() => {});
    await page.keyboard.down('Shift');
    await linhas[linhas.length - 1].click();
    await page.keyboard.up('Shift');
  }

  // Aguarda #btnAvancar ficar habilitado
  await frame.waitForFunction(
    () => !document.querySelector('#btnAvancar')?.disabled,
    { timeout: 5000 }
  );
  await clicarBotao(frame, '#btnAvancar');

  // Aguarda tabela de condição ser populada
  await frame.waitForSelector('#tblCondicao tbody tr', { timeout: 15000 });

  return parcelas;
}

module.exports = { selecionarTodasParcelas };
