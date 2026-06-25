async function lerCondicao(frame) {
  // Aguarda a seção de condição aparecer (AJAX popula o tblCondicao)
  await frame.waitForSelector('#tblCondicao tbody tr', { timeout: 15000 });

  return frame.evaluate(() => {
    const linha = document.querySelector('#tblCondicao tbody tr');
    const valor = linha?.querySelector('td:nth-child(3)')?.textContent?.trim() || '';
    const textoData = document.querySelector('#selCondicaoDataPagamento')?.textContent?.trim() || '';
    const vencimento = textoData.match(/(\d{2}\/\d{2}\/\d{4})/)?.[1] || '';
    return { valor, vencimento };
  });
}

async function confirmarAVista(frame) {
  await frame.waitForSelector('#tblCondicao input[type="radio"]');
  await frame.click('#tblCondicao input[type="radio"]');

  // Aguarda #btnAvancar ficar habilitado (vira "Finalizar" nessa etapa)
  await frame.waitForFunction(
    () => !document.querySelector('#btnAvancar')?.disabled,
    { timeout: 5000 }
  );
  await frame.click('#btnAvancar');

  // Aguarda o modal de dados cadastrais aparecer
  await frame.waitForSelector('#formDadosCadastrais', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 500));
}

module.exports = { lerCondicao, confirmarAVista };
