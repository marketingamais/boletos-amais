const PORTAL_URL = process.env.PORTAL_URL || 'https://amais.io/negociar';

async function obterFrame(page) {
  await page.waitForSelector('#router');
  const handle = await page.$('#router');
  const frame = await handle.contentFrame();
  await frame.waitForSelector('body');
  return frame;
}

async function login(page, cpf) {
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const frame = await obterFrame(page);

  // Aceita banner de cookies se existir
  const cookieBtn = await frame.$('#btnSalvarCookie');
  if (cookieBtn) {
    await cookieBtn.click();
    await new Promise(r => setTimeout(r, 800));
  }

  // Preenche CPF e faz login
  await frame.waitForSelector('#usuario');
  await frame.$eval('#usuario', el => (el.value = ''));
  await frame.type('#usuario', cpf.replace(/\D/g, ''));
  await frame.click('#btnLogin');

  // Aguarda tabela de instituições aparecer (AJAX — sem navegação real)
  await frame.waitForSelector('#tblContrato tbody tr', { timeout: 15000 });

  return frame;
}

module.exports = { login, obterFrame };
