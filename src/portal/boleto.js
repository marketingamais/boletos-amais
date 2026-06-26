const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { clicarBotao } = require('./helpers');

// Le a tabela de acompanhamento (tela de boleto). Colunas: Sel, Parcela, Valor, Vencimento.
// Retorna o valor total (soma das parcelas) e o vencimento da primeira parcela.
async function lerAcompanhamento(frame) {
  await frame.waitForSelector('#tblAcompanhamento tbody tr', { timeout: 15000 });

  const parcelas = await frame.evaluate(() =>
    [...document.querySelectorAll('#tblAcompanhamento tbody tr')].map(tr => ({
      numero: tr.querySelector('td:nth-child(2)')?.textContent?.trim() || '',
      valor: tr.querySelector('td:nth-child(3)')?.textContent?.trim() || '',
      vencimento: tr.querySelector('td:nth-child(4)')?.textContent?.trim() || '',
    }))
  );

  const vencimento = parcelas[0]?.vencimento || '';
  let valorTotal;
  if (parcelas.length <= 1) {
    valorTotal = parcelas[0]?.valor || '';
  } else {
    const total = parcelas.reduce((acc, p) => {
      const n = parseFloat(String(p.valor).replace(/\./g, '').replace(',', '.'));
      return acc + (Number.isNaN(n) ? 0 : n);
    }, 0);
    valorTotal = total.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  return { valorTotal, vencimento, parcelas };
}

async function verificarBoletoDisponivel(frame) {
  await new Promise(r => setTimeout(r, 1000));
  return frame.evaluate(() => {
    const btn = document.querySelector('#btnSalvarBoleto');
    return btn && !btn.disabled && !btn.classList.contains('hidden');
  });
}

async function gerarBoleto(page, frame) {
  await frame.waitForSelector('#btnSalvarBoleto:not([disabled])');

  // Diretório temporário para capturar o download
  const downloadDir = path.join(os.tmpdir(), `boleto_${Date.now()}`);
  fs.mkdirSync(downloadDir, { recursive: true });

  // Configura o Puppeteer para salvar downloads nesse diretório
  const client = await page.createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadDir,
  });

  // Clica no botão Salvar e aguarda o arquivo aparecer no diretório
  await clicarBotao(frame, '#btnSalvarBoleto');

  const pdfPath = await aguardarDownload(downloadDir, 20000);
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfBuffer.toString('base64');
  const linhaDigitavel = await extrairLinhaDigitavel(pdfBuffer);

  // Limpa o arquivo temporário
  try { fs.rmSync(downloadDir, { recursive: true }); } catch (_) {}

  return { pdfBase64, linhaDigitavel };
}

function aguardarDownload(dir, timeoutMs) {
  return new Promise((resolve, reject) => {
    const inicio = Date.now();
    const checar = () => {
      const arquivos = fs.readdirSync(dir).filter(f => !f.endsWith('.crdownload') && !f.endsWith('.tmp'));
      if (arquivos.length > 0) {
        return resolve(path.join(dir, arquivos[0]));
      }
      if (Date.now() - inicio > timeoutMs) {
        return reject(new Error('Timeout aguardando download do boleto'));
      }
      setTimeout(checar, 500);
    };
    checar();
  });
}

async function extrairLinhaDigitavel(pdfBuffer) {
  try {
    const { text } = await pdfParse(pdfBuffer);
    const match = text.match(/\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}\s\d\s\d{14}/);
    return match ? match[0].trim() : '';
  } catch {
    return '';
  }
}

module.exports = { gerarBoleto, verificarBoletoDisponivel, lerAcompanhamento };
