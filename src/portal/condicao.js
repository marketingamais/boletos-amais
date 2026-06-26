const { avancarEAguardar } = require('./helpers');

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

// Seleciona a condicao a vista e avanca para o formulario de dados cadastrais.
// Retorna o frame da tela do formulario.
async function confirmarAVista(frame, page) {
  await frame.waitForSelector('#tblCondicao input[type="radio"]');
  await frame.evaluate(() => {
    const radio = document.querySelector('#tblCondicao input[type="radio"]');
    radio.scrollIntoView({ block: 'center' });
    radio.click();
  });

  // Aguarda #btnAvancar ficar habilitado (vira "Finalizar" nessa etapa)
  await frame.waitForFunction(
    () => !document.querySelector('#btnAvancar')?.disabled,
    { timeout: 5000 }
  );

  // Avanca e re-adquire o frame ja com o formulario de dados cadastrais
  const novoFrame = await avancarEAguardar(frame, page, '#btnAvancar', '#formDadosCadastrais', {
    timeoutPorTentativa: 8000,
  });
  await new Promise(r => setTimeout(r, 500));
  return novoFrame;
}

module.exports = { lerCondicao, confirmarAVista };
