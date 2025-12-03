
# How to setup

To run this project you will need a `config.js` file like this one in the root of project:


```bash
module.exports = {
  botToken: 'Your_bot_token',
  ownerID: 'Your_ID',
  logInteraction: function(ctx) {
    const userId = ctx.from.id;
    const username = ctx.from.username;
    const timestamp = new Date().toLocaleString();
    const command = ctx.update.message.text;
    console.log(`ID do usuário: ${userId}`);
    console.log(`Username do usuário: ${username}`);
    console.log(`Horário: ${timestamp}`);
    console.log(`Comando: ${command}`);
  }
};
```

Remember to change botToken for your own bot token created using botFather (oficial Telegram bot, to create other bots) and if you want, add your Telegram ID in ownerID.

After configurate and added the config file in the project. Make sure you have the NodeJS and npm packages installed. If it is ok, just run `npm install` and it is done!  🎉
# furg-toolkit-tg-bot
