const { obterFrame } = require('./helpers');

// Todos os campos dentro de #formDadosCadastrais para evitar conflito com o modal de perfil
const FORM = '#formDadosCadastrais';

async function preencherCampo(frame, seletor, valor) {
  if (!valor) return;
  await frame.$eval(seletor, el => {
    el.value = '';
    el.removeAttribute('disabled');
  });
  await frame.type(seletor, String(valor));
}

async function preencherDados(frame, page, dados) {
  await frame.waitForSelector(FORM);

  // Captura o nome do aluno (campo read-only preenchido pelo portal)
  const nomeAluno = await frame.$eval(`${FORM} #nomeClienteAtu`, el => el.value || el.textContent || '').catch(() => '');

  // Nome é read-only no portal — não preenchemos
  await preencherCampo(frame, `${FORM} #inptEmail`, dados.email);
  await preencherCampo(frame, `${FORM} [name="FONE1"]`, dados.telefone1);
  await preencherCampo(frame, `${FORM} [name="FONE2"]`, dados.telefone2 || '');
  await preencherCampo(frame, `${FORM} [name="ENDERECO"]`, dados.endereco);
  await preencherCampo(frame, `${FORM} [name="BAIRRO"]`, dados.bairro);
  await preencherCampo(frame, `${FORM} [name="CIDADE"]`, dados.cidade);
  await preencherCampo(frame, `${FORM} [name="UF"]`, dados.uf);
  await preencherCampo(frame, `${FORM} [name="CEP"]`, dados.cep);

  await frame.click('#btnAtualizarDadosCadastrais');

  // Aguarda resolução: sucesso (tblAcompanhamento) ou erro (SweetAlert)
  await new Promise(r => setTimeout(r, 2000));

  // Se aparecer alerta de validação (SweetAlert), lança erro com a mensagem
  const alertMsg = await frame.evaluate(() => {
    const swal = document.querySelector('.swal-modal');
    if (swal && swal.offsetParent !== null) {
      return swal.querySelector('.swal-text')?.textContent?.trim() || 'Erro de validação no formulário';
    }
    return null;
  });
  if (alertMsg) throw new Error(`Validação do portal: ${alertMsg}`);

  // Apos o submit o portal pode renavegar o iframe: re-adquire o frame antes de
  // aguardar a tabela de acompanhamento (sucesso da negociação)
  const novoFrame = await obterFrame(page);
  await novoFrame.waitForSelector('#tblAcompanhamento tbody tr', { timeout: 20000 });

  return { nomeAluno: nomeAluno.trim(), frame: novoFrame };
}

module.exports = { preencherDados };
