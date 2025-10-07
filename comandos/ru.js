const { chromium } = require('playwright');

async function scrapeWebsite(url) {
  const browser = await chromium.launch({headless: true}); // Inicializa o navegador Chromium
  const context = await browser.newContext(); // Cria um novo contexto de navegação
  const page = await context.newPage(); // Cria uma nova página dentro do contexto
  await page.goto(url , {waitUntil: 'domcontentloaded'}); // Navega para a URL fornecida
  await page.waitForTimeout(1500); // Aguarda que os conteudos no cardapio sejam inicializados (se existirem)
  await page.waitForSelector('.cardapio'); // Aguarda a existência do seletor '.cardapio' na página

  const hasCardapio = await page.$eval('.panel-heading.custom-panel__heading', (element) => {
    // Verifica se o texto "Não há cardápio cadastrado para exibição no momento." está presente no elemento '.panel-heading.custom-panel__heading'
    return element.textContent.includes('Não há cardápio cadastrado para exibição no momento.');
  }).catch(() => false);

  if (hasCardapio) {
    await browser.close(); // Fecha o navegador
    return 'Não há cardápio'; // Retorna a string indicando a ausência de cardápio
  }

  const cardapioElement = await page.$('.cardapio'); // Localiza o elemento '.cardapio' na página
  const dayWeek = await page.$('.date-slider-dayweek'); // Localiza o dia da semana no cardapio
  if (dayWeek && cardapioElement) {

    const screenshot = await cardapioElement.screenshot({ fullPage: true }); // Tira uma captura de tela do elemento

    await browser.close(); // Fecha o navegador

    return screenshot; // Retorna a captura de tela como resultado
  } else {
    await browser.close(); // Fecha o navegador
    return 'Não há cardápio'; // Retorna a string indicando a ausência de cardápio
  }
}

async function scrapeHorarios(url) {
  const browser = await chromium.launch({headless: true}); // Inicializa o navegador Chromium
  const context = await browser.newContext(); // Cria um novo contexto de navegação
  const page = await context.newPage(); // Cria uma nova página dentro do contexto
  
  try {
    await page.goto(url, {waitUntil: 'domcontentloaded'}); // Navega para a URL fornecida
    await page.waitForTimeout(2000); // Aguarda que a página carregue completamente
    
    // Busca o elemento com id ui-id-4
    const horariosElement = await page.$('#ui-id-4');
    if (horariosElement) {
      const horariosText = await horariosElement.textContent();
      await browser.close();
      return horariosText.trim();
    } else {
      await browser.close();
      return 'Horários não encontrados';
    }
  } catch (error) {
    await browser.close();
    console.error('Erro ao buscar horários:', error);
    return 'Erro ao buscar horários';
  }
}

module.exports = async (ctx) => {
  const message = await ctx.reply('Por favor, aguarde breves momentos enquanto provemos a ti o distinto cardápio...');

  try {
    const urlCC = 'https://www.furg.br/?view=category&id=231';
    const resultCC = await scrapeWebsite(urlCC); // Executa o scraping para a primeira URL
    const captionCC = `[🔗RU CC](${urlCC})`;

    const urlLago = 'https://www.furg.br/?view=category&id=233';
    const resultLago = await scrapeWebsite(urlLago); // Executa o scraping para a segunda URL
    const captionLago = `[🔗RU LAGO](${urlLago})`;

    if (resultCC === 'Não há cardápio' && resultLago === 'Não há cardápio') {
      // Se ambos os resultados indicarem ausência de cardápio
      await ctx.reply(`Não há cardápio cadastrado nos RUs neste momento, tente novamente mais tarde.`);
    } else if (resultLago === 'Não há cardápio') {
      // Se apenas o resultado2 indicar ausência de cardápio
      await ctx.replyWithPhoto({ source: resultCC }, { caption: `Não há cardápio cadastrado no ${captionLago} neste momento, tente novamente mais tarde.`, parse_mode: 'Markdown' });
    } else if (resultCC === 'Não há cardápio') {
      // Se apenas o resultado1 indicar ausência de cardápio
      await ctx.replyWithPhoto({ source: resultLago }, { caption: `Não há cardápio cadastrado no ${captionCC} neste momento, tente novamente mais tarde.`, parse_mode: 'Markdown' });
    } else {
      // Se ambos os resultados contiverem capturas de tela válidas
      await ctx.replyWithPhoto({ source: resultCC }, { caption: `Para mais informações acesse: ${captionCC}`, parse_mode: 'Markdown' });
      await ctx.replyWithPhoto({ source: resultLago }, { caption: `Para mais informações acesse: ${captionLago}`, parse_mode: 'Markdown' });
    }

    // Pergunta sobre os horários com link para comando
    await ctx.reply('Gostaria de saber os horários de funcionamento dos RUs?\n\n💡 Use o comando /horarios para ver os horários!');
    
    await ctx.deleteMessage(message.message_id); // Deleta a mensagem anterior

  } catch (error) {
    await ctx.deleteMessage(message.message_id);
    console.error('Ocorreu um erro durante o web scraping:', error);
    await ctx.reply('Desculpe, ocorreu um erro durante o web scraping.'); // Retorna uma mensagem de erro em caso de exceção
  }
};

// Função para formatar o texto dos horários
function formatarHorarios(textoOriginal) {
  if (!textoOriginal || textoOriginal.trim() === '') {
    return 'Horários não disponíveis';
  }

  let textoFormatado = textoOriginal;
  
  // Adiciona emoticons e quebras de linha para cada refeição
  // Café da manhã - padrões mais amplos
  textoFormatado = textoFormatado.replace(/(café\s*da\s*manhã|cafe\s*da\s*manha|breakfast|café|cafe)/gi, '\n\n🌅 **Café da Manhã**');
  
  // Almoço - padrões mais amplos
  textoFormatado = textoFormatado.replace(/(almoço|almoco|lunch)/gi, '\n\n🍽️ **Almoço**');
  
  // Jantar - padrões mais amplos
  textoFormatado = textoFormatado.replace(/(jantar|janta|dinner)/gi, '\n\n🌙 **Jantar**');
  
  // Lanche/merenda se existir
  textoFormatado = textoFormatado.replace(/(lanche|merenda|snack)/gi, '\n\n🥪 **Lanche**');

  // Adiciona quebra de linha antes de "sábado" (ou "sabado" sem acento)
  textoFormatado = textoFormatado.replace(/(\s*)(s[áa]bado)/gi, '\n$2');

  // Remove quebras de linha triplas ou mais
  textoFormatado = textoFormatado.replace(/\n{3,}/g, '\n\n');
  
  // Remove quebras de linha no início
  textoFormatado = textoFormatado.replace(/^\s*\n+/, '');
  
  // Limpa espaços em branco extras
  textoFormatado = textoFormatado.trim();
  
  return textoFormatado;
}

// Função separada para buscar e exibir horários
module.exports.horarios = async (ctx) => {
  const message = await ctx.reply('Buscando horários de funcionamento dos RUs...');
  
  try {
    // Busca os horários usando uma das URLs (tanto CC quanto Lago funcionam)
    const urlCC = 'https://www.furg.br/?view=category&id=231';
    const horarios = await scrapeHorarios(urlCC);
    
    if (horarios && horarios !== 'Horários não encontrados' && horarios !== 'Erro ao buscar horários') {
      // Formata o texto dos horários
      const horariosFormatados = formatarHorarios(horarios);
      await ctx.reply(`*Horários de Funcionamento dos RUs:*\n${horariosFormatados}`, { parse_mode: 'Markdown' });
    } else {
      await ctx.reply('Não foi possível obter os horários de funcionamento no momento. Tente novamente mais tarde.');
    }
    
    await ctx.deleteMessage(message.message_id);
  } catch (error) {
    await ctx.deleteMessage(message.message_id);
    console.error('Erro ao buscar horários:', error);
    await ctx.reply('Ocorreu um erro ao buscar os horários. Tente novamente mais tarde.');
  }
};