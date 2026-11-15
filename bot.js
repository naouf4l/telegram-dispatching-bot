const TelegramBot = require("node-telegram-bot-api");

console.log("=================================");
console.log("DÉMARRAGE DU BOT");
console.log("TOKEN PRESENT =", !!process.env.TOKEN);
console.log("CHAT_ID ENV =", process.env.CHAT_ID);
console.log("ADMIN_ID ENV =", process.env.ADMIN_ID);
console.log("=================================");

if (!process.env.TOKEN) {
  console.error("TOKEN MANQUANT");
  process.exit(1);
}

const bot = new TelegramBot(process.env.TOKEN, {
  polling: true
});

bot.getMe()
  .then((me) => {
    console.log("BOT CONNECTÉ :", me.username);
  })
  .catch((err) => {
    console.error("ERREUR getMe :", err);
  });

bot.on("message", (msg) => {

  console.log("=================================");
  console.log("MESSAGE REÇU");
  console.log("CHAT_ID =", msg.chat.id);
  console.log("CHAT_TITLE =", msg.chat.title);
  console.log("CHAT_TYPE =", msg.chat.type);
  console.log("USER_ID =", msg.from.id);
  console.log("USER =", msg.from.first_name);
  console.log("TEXT =", msg.text);
  console.log("=================================");

});

bot.on("polling_error", (err) => {
  console.error("POLLING ERROR :", err.message);
});

console.log("Polling démarré");