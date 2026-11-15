const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.TOKEN, {
  polling: true
});

console.log("BOT STARTED");

bot.getMe().then(me => {
  console.log("BOT =", me.username);
});

bot.on("message", (msg) => {

  console.log("========== MESSAGE ==========");
  console.log("CHAT_ID =", msg.chat.id);
  console.log("CHAT_TYPE =", msg.chat.type);
  console.log("USER_ID =", msg.from.id);
  console.log("USER =", msg.from.first_name);
  console.log("TEXT =", msg.text);
  console.log("============================");

  bot.sendMessage(
    msg.chat.id,
    "Message reçu ✅"
  );

});