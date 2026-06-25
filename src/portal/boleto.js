const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const os = require('os');

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
  await frame.click('#btnSalvarBoleto');

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

module.exports = { gerarBoleto };
