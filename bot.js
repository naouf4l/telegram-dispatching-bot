const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TOKEN;
const chatId = process.env.CHAT_ID;

const bot = new TelegramBot(token, { polling: true });

// Liste dynamique des participants
let participants = new Set();

// Validations de la semaine
let validated = new Set();

// Historique de l'ordre de validation
let lastWeekOrder = [];

// Ajouter automatiquement les participants
bot.on('message', (msg) => {
  if (!msg.from || msg.from.is_bot) return;

  const name = msg.from.first_name.trim();
  participants.add(name);

  const text = msg.text || "";

  // Détection validation
  if (text.includes("✅")) {

    // Validation pour quelqu'un d'autre
    for (let p of participants) {
      if (text.toLowerCase().includes(p.toLowerCase())) {
        validated.add(p);
        bot.sendMessage(msg.chat.id, `${p} a été validé(e) ✔️`);
        return;
      }
    }

    // Validation pour soi-même
    validated.add(name);
    bot.sendMessage(msg.chat.id, `${name} a validé ✔️`);
  }
});

// Génération de la répartition
function generateDistribution(order) {
  let pages = [];
  let start = 1;

  // 7 pages pour les 3 premiers
  for (let i = 0; i < 3 && i < order.length; i++) {
    pages.push({
      person: order[i],
      from: start,
      to: start + 6
    });
    start += 7;
  }

  // 5 pages pour les 4 suivants
  for (let i = 3; i < 7 && i < order.length; i++) {
    pages.push({
      person: order[i],
      from: start,
      to: start + 4
    });
    start += 5;
  }

  // 1 page pour le reste
  for (let i = 7; i < order.length; i++) {
    pages.push({
      person: order[i],
      from: start,
      to: start
    });
    start += 1;
  }

  return pages;
}

// Envoi du message formaté
function sendDistribution(distribution) {
  let msg = `السلام عليكم ورحمة الله وبركاته\n\nVoici la nouvelle répartition 📖 :\n\n`;

  msg += `7 pages\n`;
  for (let i = 0; i < 3 && i < distribution.length; i++) {
    const d = distribution[i];
    msg += `${i+1}) ${d.from} à ${d.to} : ${d.person}\n`;
  }

  msg += `\n5 pages\n`;
  for (let i = 3; i < 7 && i < distribution.length; i++) {
    const d = distribution[i];
    msg += `${i+1}) ${d.from} à ${d.to} : ${d.person}\n`;
  }

  msg += `\n1 page\n`;
  for (let i = 7; i < distribution.length; i++) {
    const d = distribution[i];
    msg += `${i+1}) ${d.from} : ${d.person}\n`;
  }

  bot.sendMessage(chatId, msg);
}

// CRON : samedi 20h → rappel aux retardataires
setInterval(() => {
  const now = new Date();
  if (now.getDay() === 6 && now.getHours() === 20) {

    let missing = [...participants].filter(p => !validated.has(p));

    if (missing.length > 0) {
      bot.sendMessage(chatId,
        `Rappel 📌\nLes personnes suivantes n'ont pas encore validé :\n\n${missing.join("\n")}`
      );
    }
  }
}, 1000 * 60);

// CRON : dimanche 20h → envoi de la répartition
setInterval(() => {
  const now = new Date();
  if (now.getDay() === 0 && now.getHours() === 20) {

    // Déterminer l'ordre : ceux qui ont validé en premier passent en tête
    let newOrder = [...validated].concat(
      [...participants].filter(p => !validated.has(p))
    );

    lastWeekOrder = newOrder;

    const distribution = generateDistribution(newOrder);
    sendDistribution(distribution);

    validated.clear();
  }
}, 1000 * 60);