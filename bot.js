const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const fs = require("fs");

const bot = new TelegramBot(process.env.TOKEN,{polling:true});
const CHAT_ID = process.env.CHAT_ID ? Number(process.env.CHAT_ID) : null;
const ADMIN_ID = process.env.ADMIN_ID ? Number(process.env.ADMIN_ID) : null;
const DATA_FILE='./data.json';

function loadData(){
 if(!fs.existsSync(DATA_FILE)){
  fs.writeFileSync(DATA_FILE,JSON.stringify({currentPage:1,participants:[],validationOrder:[],lastDistribution:[]},null,2));
 }
 return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
}
function saveData(d){fs.writeFileSync(DATA_FILE,JSON.stringify(d,null,2));}
function nextPage(p){return p>=604?1:p+1;}
function isAdmin(msg){return ADMIN_ID && msg.from.id===ADMIN_ID;}

bot.getMe().then(me=>console.log('BOT CONNECTE:',me.username));

bot.on('message',(msg)=>{
 console.log(`[GROUP DETECT] chatId=${msg.chat.id} type=${msg.chat.type} title=${msg.chat.title||'PRIVATE'}`);
 if(msg.text==='/debug'){
  return bot.sendMessage(msg.chat.id,`CHAT_ID=${msg.chat.id}
USER_ID=${msg.from.id}`);
 }
 if(CHAT_ID && msg.chat.id!==CHAT_ID) return;
 const text=(msg.text||'').trim();
 const data=loadData();
 if(text==='✅'){
   const p=data.participants.find(x=>x.telegramId===msg.from.id);
   if(!p){
      const candidate=data.participants.find(x=>x.telegramId===null && x.name.toLowerCase()===msg.from.first_name.toLowerCase());
      if(candidate){candidate.telegramId=msg.from.id; saveData(data);} else return;
   }
   const pid=(data.participants.find(x=>x.telegramId===msg.from.id)||{}).telegramId;
   if(pid && !data.validationOrder.includes(pid)){data.validationOrder.push(pid); saveData(data);} 
   return bot.sendMessage(msg.chat.id,`${msg.from.first_name} validé ✅`);
 }
 const m=text.match(/^(.+?)\s*✅$/);
 if(m){
   const p=data.participants.find(x=>x.name.toLowerCase()===m[1].trim().toLowerCase());
   if(p && p.telegramId && !data.validationOrder.includes(p.telegramId)){
      data.validationOrder.push(p.telegramId); saveData(data);
      bot.sendMessage(msg.chat.id,`${p.name} validé ✅`);
   }
 }
});

bot.onText(/\/ajouter (.+)/,(msg,match)=>{
 if(!isAdmin(msg)) return;
 const d=loadData();
 d.participants.push({name:match[1].trim(),telegramId:null});
 saveData(d);
 bot.sendMessage(msg.chat.id,'Ajouté');
});

bot.onText(/\/participants/,(msg)=>{
 const d=loadData();
 bot.sendMessage(msg.chat.id,d.participants.map(p=>`• ${p.name}`).join('
')||'Aucun');
});

function generateDistribution(){console.log('Distribution générée');}
function sendReminder(){console.log('Rappel envoyé');}
cron.schedule('0 8 * * 0',sendReminder);
cron.schedule('0 20 * * 0',generateDistribution);
