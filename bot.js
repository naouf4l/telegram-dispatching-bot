console.log("TOKEN =", process.env.TOKEN);
const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const fs = require("fs");

const bot = new TelegramBot(process.env.TOKEN, {
  polling: true
});

const CHAT_ID = Number(process.env.CHAT_ID);
const ADMIN_ID = Number(process.env.ADMIN_ID);

const DATA_FILE = "./data.json";

function loadData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(data, null, 2)
  );
}

function nextPage(page) {
  return page >= 604 ? 1 : page + 1;
}

function isAdmin(msg) {
  return msg.from.id === ADMIN_ID;
}

function registerParticipant(msg) {
  let data = loadData();

  const existing = data.participants.find(
    p => p.id === msg.from.id
  );

  if (!existing) {
    data.participants.push({
      id: msg.from.id,
      name: msg.from.first_name
    });

    saveData(data);
  } else {
    existing.name = msg.from.first_name;
    saveData(data);
  }
}

function validatePerson(personId) {
  const data = loadData();

  if (!data.validationOrder.includes(personId)) {
    data.validationOrder.push(personId);
    saveData(data);
  }
}

function findByName(name) {
  const data = loadData();

  return data.participants.find(
    p =>
      p.name.toLowerCase() ===
      name.toLowerCase()
  );
}

bot.on("message", msg => {

  if (msg.chat.id !== CHAT_ID) {
    return;
  }

  if (!msg.from.is_bot) {
    registerParticipant(msg);
  }

  const text = (msg.text || "").trim();

  // ✅
  if (text === "✅") {

    validatePerson(msg.from.id);

    bot.sendMessage(
      CHAT_ID,
      `${msg.from.first_name} validé ✅`
    );

    return;
  }

  // "Sami ✅"
  const proxyMatch =
    text.match(/^(.+?)\s*✅$/);

  if (proxyMatch) {

    const participant =
      findByName(proxyMatch[1].trim());

    if (participant) {

      validatePerson(participant.id);

      bot.sendMessage(
        CHAT_ID,
        `${participant.name} validé ✅`
      );
    }

    return;
  }

});


// ADMIN : ajouter
bot.onText(/\/ajouter (.+)/, (msg, match) => {

  if (!isAdmin(msg)) return;

  const data = loadData();

  data.participants.push({
    id: Date.now(),
    name: match[1].trim()
  });

  saveData(data);

  bot.sendMessage(
    CHAT_ID,
    `${match[1]} ajouté`
  );
});

// ADMIN : supprimer
bot.onText(/\/supprimer (.+)/, (msg, match) => {

  if (!isAdmin(msg)) return;

  const data = loadData();

  data.participants =
    data.participants.filter(
      p =>
        p.name.toLowerCase() !==
        match[1].toLowerCase()
    );

  saveData(data);

  bot.sendMessage(
    CHAT_ID,
    `${match[1]} supprimé`
  );
});


// participants
bot.onText(/\/participants/, msg => {

  const data = loadData();

  const people =
    data.participants
      .map(p => `• ${p.name}`)
      .join("\n");

  bot.sendMessage(
    CHAT_ID,
    `Participants :\n\n${people}`
  );
});


// etat
bot.onText(/\/etat/, msg => {

  const data = loadData();

  const validated =
    data.participants.filter(
      p =>
        data.validationOrder.includes(p.id)
    );

  const missing =
    data.participants.filter(
      p =>
        !data.validationOrder.includes(
          p.id
        )
    );

  let report =
`✅ Validés

${validated.map(x => x.name).join("\n")}

❌ En attente

${missing.map(x => x.name).join("\n")}`;

  bot.sendMessage(CHAT_ID, report);

});

function generateDistribution() {

  const data = loadData();

  const validatedParticipants =
    data.validationOrder
      .map(id =>
        data.participants.find(
          p => p.id === id
        )
      )
      .filter(Boolean);

  const remaining =
    data.participants.filter(
      p =>
        !data.validationOrder.includes(
          p.id
        )
    );

  const ranking =
    [...validatedParticipants, ...remaining];

  let current = data.currentPage;

  const assignments = [];

  ranking.forEach((person, index) => {

    let pages = 1;

    if (index < 3)
      pages = 7;
    else if (index < 7)
      pages = 5;

    let start = current;
    let end = current;

    for (let i = 1; i < pages; i++) {
      end = nextPage(end);
    }

    assignments.push({
      person: person.name,
      start,
      end,
      pages
    });

    current = nextPage(end);

  });

  data.currentPage = current;
  data.validationOrder = [];
  data.lastDistribution =
    assignments;

  saveData(data);

  sendDistribution(assignments);

}

function sendDistribution(items) {

  let msg =
`السلام عليكم ورحمة الله وبركاته

Voici la nouvelle répartition 📖 :

`;

  msg += "7 pages\n";

  items
    .filter(x => x.pages === 7)
    .forEach((x, i) => {

      msg += `${i + 1}) ${x.start} à ${x.end} : ${x.person}\n`;

    });

  msg += "\n5 pages\n";

  items
    .filter(x => x.pages === 5)
    .forEach((x, i) => {

      msg += `${i + 4}) ${x.start} à ${x.end} : ${x.person}\n`;

    });

  msg += "\n1 page\n";

  let idx = 8;

  items
    .filter(x => x.pages === 1)
    .forEach(x => {

      msg += `${idx++}) ${x.start} : ${x.person}\n`;

    });

  bot.sendMessage(CHAT_ID, msg);

}

function sendReminder() {

  const data = loadData();

  const missing =
    data.participants.filter(
      p =>
        !data.validationOrder.includes(
          p.id
        )
    );

  if (missing.length === 0)
    return;

  const text =
`📌 Rappel

Les personnes suivantes n'ont pas validé :

${missing.map(x => x.name).join("\n")}`;

  bot.sendMessage(CHAT_ID, text);

}

// dimanche 08h
cron.schedule("0 8 * * 0", () => {
  sendReminder();
});

// dimanche 20h
cron.schedule("0 20 * * 0", () => {
  generateDistribution();
});

// commande test admin
bot.onText(/\/forcer/, msg => {

  if (!isAdmin(msg)) return;

  generateDistribution();

});

console.log("Bot démarré");

bot.on("message", (msg) => {
  console.log("CHAT_ID =", msg.chat.id);
});

bot.on("message", (msg) => {
  console.log("ADMIN_ID =", msg.from.id);
});