// Re-adquire o frame do iframe #router. A cada navegacao do portal (SPA dentro
// do iframe), a referencia anterior do frame fica obsoleta/detached, entao
// precisamos pegar o contentFrame atual novamente.
async function obterFrame(page) {
  await page.waitForSelector('#router', { timeout: 20000 });
  const handle = await page.$('#router');
  const frame = await handle.contentFrame();
  await frame.waitForSelector('body');
  return frame;
}

// Clica em um elemento de forma robusta:
// 1. Aguarda o seletor existir
// 2. Rola ate o centro da viewport (evita "Node is either not clickable or not
//    an Element" quando o botao esta abaixo da dobra)
// 3. Usa frame.click() (eventos de mouse reais, necessarios para o AJAX do portal)
// 4. Fallback: dispara mousedown/mouseup/click manualmente se o Puppeteer recusar
async function clicarBotao(frame, selector, { timeout = 10000 } = {}) {
  await frame.waitForSelector(selector, { timeout });

  await frame.evaluate((sel) => {
    document.querySelector(sel)?.scrollIntoView({ block: 'center', inline: 'center' });
  }, selector);
  await new Promise((r) => setTimeout(r, 150));

  try {
    await frame.click(selector);
  } catch (err) {
    if (!/not clickable|not an Element/i.test(String(err && err.message))) throw err;
    await frame.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) throw new Error('Elemento nao encontrado: ' + sel);
      ['mousedown', 'mouseup', 'click'].forEach((type) =>
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }))
      );
    }, selector);
  }
}

// Clica num botao de navegacao e aguarda a proxima tela carregar.
// Apos o clique o iframe renavega; em vez de confiar na referencia antiga,
// re-adquire o frame e procura o seletor esperado, com algumas tentativas
// (cobre tanto navegacao real quanto AJAX no mesmo frame, e variacoes de timing).
async function avancarEAguardar(frame, page, btnSelector, esperaSelector, {
  tentativas = 5,
  timeoutPorTentativa = 8000,
} = {}) {
  await clicarBotao(frame, btnSelector);

  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const f = await obterFrame(page);
      await f.waitForSelector(esperaSelector, { timeout: timeoutPorTentativa });
      return f;
    } catch (err) {
      ultimoErro = err;
    }
  }
  throw ultimoErro || new Error(`Timeout aguardando "${esperaSelector}" apos clicar em "${btnSelector}".`);
}

module.exports = { obterFrame, clicarBotao, avancarEAguardar };
