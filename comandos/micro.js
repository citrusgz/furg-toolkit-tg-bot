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

    // Atribui a variável horarios à lista formada por tdElements
    let horarios = tdElements
      .map(horario => horario.replace(/\*|\(saída EQA\)|\-|\ /g, ''))
      .filter(horario => horario.trim() !== '')
      .sort();

    // Função para verificar se é fim de semana
    function isWeekend() {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 (Sunday) to 6 (Saturday)
      return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
    }

    // Obter o horário atual
    const currentTime = new Date();
    const currentTimeFormatted = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

    // Encontrar o próximo horário disponível
    let horarioProximo = null;

    for (let horario of horarios) {
      const [horas, minutos] = horario.split(':');
      const busTime = new Date(currentTime);
      busTime.setHours(Number(horas));
      busTime.setMinutes(Number(minutos));
    
      if (busTime > currentTime) {
        horarioProximo = horario;
        break;
      }
    }

    if (!horarioProximo) {
      horarioProximo = horarios[0]; // Se não houver próximo na lista, volta ao primeiro horário do dia.
    }

    // Função para calcular a diferença de tempo em minutos, considerando o dia seguinte se necessário
    function calculateTimeDifference(startTime, endTime) {
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const start = new Date();
      start.setHours(startHours, startMinutes, 0, 0);
      const end = new Date();
      end.setHours(endHours, endMinutes, 0, 0);

      if (end <= start) {
        // Se o horário de fim for anterior ou igual ao horário de início, adiciona um dia
        end.setDate(end.getDate() + 1);
      }

      const diff = end - start;
      return Math.floor(diff / 1000 / 60); // Convertendo para minutos
    }

    // Cálculo do tempo até o próximo ônibus
    let tempoFalta = calculateTimeDifference(currentTimeFormatted, horarioProximo);
    let tempoFaltaTexto;

    if (tempoFalta < 60) {
      tempoFaltaTexto = tempoFalta === 1 ? '1 minuto' : `${tempoFalta} minutos`;
    } else {
      const horas = Math.floor(tempoFalta / 60);
      const minutosRestantes = tempoFalta % 60;
      tempoFaltaTexto = `${horas} horas`;
      if (minutosRestantes > 0) {
        tempoFaltaTexto += ` e ${minutosRestantes} minutos`;
      }
    }

    let indiceAtual = horarios.indexOf(horarioProximo);
    let proximo;

    if (indiceAtual !== -1 && indiceAtual < horarios.length - 1) {
      proximo = horarios[indiceAtual + 1];
    } else {
      proximo = 'Não há mais horários hoje';
    }

    let caption = `🚌 Próximo horário: ${horarioProximo}\n⏰ Tempo até o próximo ônibus: ${tempoFaltaTexto}\n⚠️ Mas tem outro ${proximo}`;

    if (isWeekend()) {
      caption = "Hoje não tem ônibus.";
    }

    await ctx.replyWithPhoto({source: screenshot}, {caption: caption}); // Envia a captura de tela como uma imagem de resposta
    await ctx.deleteMessage(message.message_id); // Deleta a mensagem anterior

  } catch (error) {
    console.error('Ocorreu um erro durante o web scraping:', error);
    await ctx.deleteMessage(message.message_id);
    await ctx.reply('Desculpe, ocorreu um erro durante o web scraping.'); // Retorna uma mensagem de erro em caso de exceção
  }
};
