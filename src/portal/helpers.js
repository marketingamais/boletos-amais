// Clica em um elemento de forma robusta:
// 1. Aguarda o seletor existir
// 2. Rola ate o elemento ficar no centro da viewport (evita "Node is either not
//    clickable or not an Element" quando o botao esta abaixo da dobra)
// 3. Usa frame.click() (eventos de mouse reais, necessarios para os handlers
//    AJAX do portal)
// 4. Fallback: se o Puppeteer ainda recusar, dispara mousedown/mouseup/click
//    manualmente dentro da pagina
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

module.exports = { clicarBotao };
