const { chromium } = require('playwright');

// Função para acessar o site de notícias da FURG e extrair informações das notícias
async function scrapeWebsite() {
    const browser = await chromium.launch({ headless: true }); // Inicia o navegador em modo invisível
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto('https://www.furg.br/comunicacao/noticias', { waitUntil: 'domcontentloaded' }); // Acessa a página de notícias
    const detalhes = await page.$$('.item-detalhado'); // Seleciona todos os elementos de notícias

    const dataItens = [];
    const linkTitulos = [];
    const titulos = [];

    // Para cada notícia encontrada, extrai a data, título e link
    for (const detalhe of detalhes) {
        const dataItem = await detalhe.$eval('.info .info__item--data', node => node.textContent.trim());
        const titulo = await detalhe.$eval('.item-detalhado__titulo a', node => node.textContent.trim());
        const linkTitulo = await detalhe.$eval('.item-detalhado__titulo a', node => node.getAttribute('href').trim());
        dataItens.push(dataItem);
        linkTitulos.push(linkTitulo);
        titulos.push(titulo);
    }

    await browser.close(); // Fecha o navegador
    return { detalhes, dataItens, linkTitulos, titulos }; // Retorna os dados extraídos
}

// Função principal exportada para ser usada pelo bot do Telegram
module.exports = async (ctx) => {
    const message = await ctx.reply('Por favor, aguarde breves momentos enquanto provemos a ti as distintas noticias...'); // Informa ao usuário que está buscando as notícias

    try {
        const { detalhes, dataItens, linkTitulos, titulos } = await scrapeWebsite(); // Chama a função de scraping

        // Função para obter a data atual no formato esperado
        function obterDataAtual() {
            const data = new Date();
            return `${data.getDate()}/0${data.getMonth() + 1}/${data.getFullYear()}`;
        }
        const hoje = obterDataAtual();

        // Calcula a data do dia anterior
        const diaAnterior = new Date(Date.now() - 86400000);
        const diaAnteriorFormatado = `${diaAnterior.getDate()}/0${diaAnterior.getMonth() + 1}/${diaAnterior.getFullYear()}`;

        let contadorNoticias = 0;
        const ultimasNoticias = [];

        // Envia ao usuário as notícias de hoje e de ontem, se houver
        for (let i = 0; i < detalhes.length; i++) {
            const dataItem = dataItens[i];
            const linkTitulo = linkTitulos[i];
            const titulo = titulos[i];

            if (dataItem === hoje || dataItem === diaAnteriorFormatado) {
                await ctx.reply(`${dataItem} [${titulo}](https://www.furg.br${linkTitulo})`, { parse_mode: 'Markdown' });
                contadorNoticias++;
            } else if (contadorNoticias < 3) {
                ultimasNoticias.push({ dataItem, linkTitulo, titulo }); // Se não houver notícias recentes, prepara para enviar as últimas disponíveis
            }
        }

        // Caso não tenha notícias de hoje/ontem suficientes, envia as últimas notícias disponíveis
        for (let i = 0; i < ultimasNoticias.length && contadorNoticias < 3; i++) {
            const { dataItem, linkTitulo, titulo } = ultimasNoticias[i];
            await ctx.reply(`${dataItem} [${titulo}](https://www.furg.br${linkTitulo})`, { parse_mode: 'Markdown' });
            contadorNoticias++;
        }

    } catch (error) {
        console.error(`Erro ao processar a página: ${error.message}`); // Loga erro caso aconteça algum problema
    }
    await ctx.deleteMessage(message.message_id); // Remove a mensagem inicial de "aguarde"
};