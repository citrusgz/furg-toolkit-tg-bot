const { chromium } = require('playwright');

async function scrapeWebsite() {
  const browser = await chromium.launch({headless: true}); // Inicializa o navegador Chromium
  const context = await browser.newContext(); // Cria um novo contexto de navegação
  const page = await context.newPage(); // Cria uma nova página dentro do contexto
  await page.goto('https://www.furg.br/horarios-do-onibus-interno', {waitUntil: 'domcontentloaded'}); // Navega para a URL fornecida
  await page.waitForSelector('tbody'); // Aguarda a existência do seletor 'tbody' na página
  const tabelaElement = await page.$('tbody'); // Localiza o elemento 'tbody' na página
  await page.waitForTimeout(1500); // Aguarda que o conteúdo seja inicializado (se existirem)
  const screenshot = await tabelaElement.screenshot(); // Tira uma captura de tela do elemento
  const tdElements = await page.$$eval('tbody td', tds => tds.map(td => td.textContent.trim())); // Procura em cada elemento td tabela (tbody) e os coloca em uma lista em forma de string

  await browser.close(); // Fecha o navegador

  return {screenshot, tdElements}; // Retorna a captura de tela como resultado
}

module.exports = async (ctx) => {
  const message = await ctx.reply('Por favor, aguarde breves momentos enquanto provemos a ti a distinta tabela...');

  try {
    const {screenshot, tdElements} = await scrapeWebsite(); // Executa o web scraping para obter a captura de tela da tabela

    let horarios = tdElements
      .map(horario => horario.replace(/\(sa[íi]da ?da ?eqa\)|\*|\-|\ /gi, ''))
      .filter(horario => horario.trim() !== '')
      .sort();

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay(); // 0 (Sunday) to 6 (Saturday)
    console.log(`Dia da semana para amanhã: ${dayOfWeek}`); // Log do dia da semana
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 7; // Sunday or Saturday

    if (isWeekend) {
      await ctx.replyWithPhoto({source: screenshot}, {caption: "Hoje não tem ônibus."}); // Envia a captura de tela como uma imagem de resposta
      await ctx.deleteMessage(message.message_id); // Deleta a mensagem anterior
      return; // Encerra a execução se for fim de semana
    }

    // Obter o horário atual
    const currentTime = new Date();

    // Encontrar o próximo horário disponível
    let horarioProximo = horarios.find(horario => {
      const [horas, minutos] = horario.split(':');
      const busTime = new Date(currentTime);
      busTime.setHours(Number(horas), Number(minutos), 0, 0);
      return busTime > currentTime;
    });

    // Cálculo do tempo até o próximo ônibus
    let tempoFaltaTexto = 'Não há mais horários hoje';
    if (horarioProximo) {
      const [horas, minutos] = horarioProximo.split(':');
      const proximoHorarioDate = new Date(currentTime);
      proximoHorarioDate.setHours(Number(horas), Number(minutos), 0, 0);
      let tempoFalta = ((proximoHorarioDate - currentTime) / 1000 / 60) | 0; // Calcula a diferença em minutos
      if (tempoFalta >= 0) {
        if (tempoFalta < 60) {
          tempoFaltaTexto = tempoFalta === 1 ? '1 minuto' : `${tempoFalta} minutos`;
        } else {
          const horasRestantes = Math.floor(tempoFalta / 60);
          const minutosRestantes = tempoFalta % 60;
          tempoFaltaTexto = `${horasRestantes} hora(s)`;
          if (minutosRestantes > 0) {
            tempoFaltaTexto += ` e ${minutosRestantes} minuto(s)`;
          }
        }
      }
    } else {
      horarioProximo = 'Não há mais horários hoje';
      tempoFaltaTexto = 'Hoje não';
    }

    let caption = `🚌 Próximo horário: ${horarioProximo}\n⏰ Tempo até o próximo ônibus: ${tempoFaltaTexto}`;

    await ctx.replyWithPhoto({source: screenshot}, {caption: caption}); // Envia a captura de tela como uma imagem de resposta
    await ctx.deleteMessage(message.message_id); // Deleta a mensagem anterior

  } catch (error) {
    console.error('Ocorreu um erro durante o web scraping:', error);
    await ctx.deleteMessage(message.message_id);
    await ctx.reply('Desculpe, ocorreu um erro durante o web scraping.'); // Retorna uma mensagem de erro em caso de exceção
  }
};