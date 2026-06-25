const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');

const SESSION_TIMEOUT_MS = parseInt(process.env.SESSION_TIMEOUT_MS || '600000');

// Map<sessionId, { browser, page, frame, timer }>
const sessions = new Map();

async function criarSessao() {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const sessionId = uuidv4();
  const sessao = { browser, page, frame: null, timer: null };
  sessao.timer = setTimeout(() => encerrarSessao(sessionId), SESSION_TIMEOUT_MS);
  sessions.set(sessionId, sessao);

  return { sessionId, page, sessao };
}

function obterSessao(sessionId) {
  const sessao = sessions.get(sessionId);
  if (!sessao) throw new Error(`Sessão ${sessionId} não encontrada ou expirada.`);
  clearTimeout(sessao.timer);
  sessao.timer = setTimeout(() => encerrarSessao(sessionId), SESSION_TIMEOUT_MS);
  return sessao;
}

async function encerrarSessao(sessionId) {
  const sessao = sessions.get(sessionId);
  if (!sessao) return;
  clearTimeout(sessao.timer);
  try { await sessao.browser.close(); } catch (_) {}
  sessions.delete(sessionId);
}

module.exports = { criarSessao, obterSessao, encerrarSessao };
