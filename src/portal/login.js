const { obterFrame } = require('./helpers');

const PORTAL_URL = process.env.PORTAL_URL || 'https://amais.io/negociar';

// Erros transitorios do Chrome quando o iframe renavega durante o login
function isFrameDetached(err) {
  const msg = String(err && err.message ? err.message : err);
  return /detached|Target closed|Session closed|frame got detached|Execution context was destroyed/i.test(msg);
}

async function tentarLogin(page, cpf) {
  await page.goto(PORTAL_URL, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  let frame = await obterFrame(page);

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

  // O iframe (#router) renavega apos o login: a referencia antiga fica
  // "detached". Re-adquire o frame antes de aguardar a tabela.
  await new Promise(r => setTimeout(r, 1500));
  frame = await obterFrame(page);

  // Aguarda tabela de instituicoes aparecer (AJAX dentro do iframe novo)
  await frame.waitForSelector('#tblContrato tbody tr', { timeout: 15000 });

  return frame;
}

// Extrai o nome do cliente abrindo o modal de Perfil (menu hamburguer > Perfil).
// O campo #nome_perfil so e populado quando o modal abre. Best-effort: retorna
// '' se nao houver nome cadastrado ou se algo falhar (nao deve quebrar o fluxo).
async function obterNomeCliente(frame) {
  try {
    await frame.evaluate(() => document.querySelector('#btnperfil')?.click());

    // Aguarda o portal carregar o nome no campo do modal
    await frame.waitForFunction(
      () => {
        const el = document.querySelector('#nome_perfil');
        return el && typeof el.value === 'string' && el.value.trim().length > 0;
      },
      { timeout: 6000 }
    ).catch(() => {});

    const nome = await frame.evaluate(() =>
      (document.querySelector('#nome_perfil')?.value || '').trim()
    );

    // Fecha o modal para nao bloquear cliques seguintes
    await frame.evaluate(() => {
      document.querySelector('#minhaConta [data-dismiss="modal"]')?.click();
    });
    await new Promise(r => setTimeout(r, 600));

    return nome;
  } catch (_) {
    return '';
  }
}

async function login(page, cpf, tentativas = 2) {
  let ultimoErro;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await tentarLogin(page, cpf);
    } catch (err) {
      ultimoErro = err;
      if (!isFrameDetached(err)) throw err;
      // Frame detachou: aguarda e refaz o fluxo de login na mesma page
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw ultimoErro;
}

module.exports = { login, obterFrame, obterNomeCliente };
