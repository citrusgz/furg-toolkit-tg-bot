// Importando os módulos necessários
const { Telegraf } = require('telegraf');
const config = require('./config');
const micro = require('./comandos/micro');
const ru = require('./comandos/ru');
const news = require('./comandos/news');
const error = require('./comandos/error');
const rateLimit = require('telegraf-ratelimit');

// Criando uma nova instância do bot com o token fornecido
const bot = new Telegraf(config.botToken);

const limitConfig = {
  window: 3000,
  limit: 2,
  onLimitExceeded: async (ctx, next) => {
    await ctx.reply('Rate limit excedido. Você não poderá gerar mais comandos pelos próximos 5 minutos 😡');
    ctx.skip = true; // Ignore messages from the user for the next 5 minutes
    setTimeout(() => {
      ctx.skip = false; // Reset the skip flag after 5 minutes
    }, 300000);
  }
}
bot.use(rateLimit(limitConfig));

// Middleware para lidar com comandos não reconhecidos
bot.use(async (ctx, next) => {
  const validCommands = ['/start', '/help', '/micro', '/ru', '/horarios', '/error', '/news'];

  if (ctx.message && ctx.message.text) {
    config.logInteraction(ctx);
    const command = ctx.message.text.split(' ')[0];
    const toLowerCaseCommand = command.toLowerCase();

    if (!validCommands.includes(toLowerCaseCommand)) {
      await ctx.reply("Por favor, envie um comando válido.");
      try {
        const chat = await ctx.getChat();
        if (chat && chat.type === 'private' && chat.blocked) {
          console.log("O bot foi bloqueado pelo usuário.");
        } else {
          try {
          } catch (error) {
            if (error.code === 403) {
              console.log("O bot foi bloqueado pelo usuário.");
            } else {
              console.error("Erro ao enviar mensagem:", error.message);
            }
          }
        }
      } catch (error) {
        console.error("Erro ao verificar o status do chat:", error.message);
      }
    } else {
      // Chamada para o próximo middleware
      await next();
    }
  }
});

// Iniciar o bot
bot.start(async (ctx) => {
  await ctx.reply('Bem-vindo! Use o comando /help para ver as instruções.');
});

// Lidar com o comando /help
bot.command('help', async (ctx) => {
  await ctx.reply(`
  🤖 Bem-vindo ao bot! Aqui estão as instruções disponíveis:
    
  /ru - Mostra os cardápios dos RUs quando disponíveis. 🍲
  
  /horarios - Mostra os horários de funcionamento dos RUs. 🕐
  
  /micro - Mostra os horários do ônibus interno. 🚌
  
  /news - Mostra as notícias mais recentes da FURG. 📰
  
  Aproveite as funcionalidades do nosso bot! 🤩✨
  `);
});

// Registrar os comandos
bot.command('ru', ru);
bot.command('horarios', ru.horarios);
bot.command('error', error);
bot.command('news', news);
bot.command('micro', micro);

// Iniciando o bot
bot.launch();
bot.startPolling();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
