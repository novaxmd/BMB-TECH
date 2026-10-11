"use strict";
const { bmbtz } = require("../../devbmb/bmbtz");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");
const s = require(__dirname + "/../../settings");
const ownerAccess = require("../../lib/ownerAccess");
const noPrefix = require("../../lib/noPrefix");
const cmdStats = require("../../lib/cmdStats");
const { getCachedSettingsSync } = require("../../lib/settingsCache");

let BOT_VERSION = "1.0.0";
try { BOT_VERSION = require("../../package.json").version || BOT_VERSION; } catch (e) { /* keep default */ }

// ====== LOAD RANDOM IMAGE FROM /scs FOLDER ======
function getRandomScsImage() {
  try {
    const scsFolder = path.join(__dirname, "../scs");
    const files = fs.readdirSync(scsFolder).filter((f) => /^menu\d+\.(jpg|jpeg|png|mp4|gif)$/i.test(f));
    if (!files.length) return null;
    return path.join(scsFolder, files[Math.floor(Math.random() * files.length)]);
  } catch (e) {
    return null; // folder missing: the menu is sent without a picture
  }
}

// ====== CONTACT QUOTE ======
const quotedContact = {
  key: {
    fromMe: false,
    participant: `0@s.whatsapp.net`,
    remoteJid: "status@broadcast"
  },
  message: {
    contactMessage: {
      displayName: "B.M.B VERIFIED ✅",
      vcard:
        "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        "FN:B.M.B VERIFIED ✅\n" +
        "ORG:BMB-TECH BOT;\n" +
        "TEL;type=CELL;type=VOICE;waid=255767862457:+255767862457\n" +
        "END:VCARD"
    }
  }
};

// ====== CONTEXT INFO (no links) ======
const contextInfo = {
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: "120363382023564830@newsletter",
    newsletterName: "𝙱.𝙼.𝙱-𝚇𝙼𝙳",
    serverMessageId: 1
  }
};

// ====== MENU LAYOUT ======
// Order and icon of every category. Categories that are not listed come last with a folder icon.
const CATEGORY_ORDER = [
  ["General", "🏠"], ["AI", "🤖"], ["Download", "📥"], ["Search", "🔎"], ["Conversion", "🔄"],
  ["Audio-Edit", "🎧"], ["Fun", "🎭"], ["Logo", "🎨"], ["Group", "👫"], ["Settings", "⚙️"],
  ["Mods", "🛠️"], ["Owner", "👑"],
];
const MEDALS = ["🥇", "🥈", "🥉"];
const RULE = "──────────────────────────";
const MAX_MESSAGE_CHARS = 3000;

/** Map of category name -> sorted list of command names. */
function groupCommands(commands) {
  const groups = new Map();
  for (const c of commands || []) {
    if (!c || !c.nomCom) continue;
    const cat = c.categorie || "Other";
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(c.nomCom);
  }
  for (const list of groups.values()) list.sort((a, b) => a.localeCompare(b));
  return groups;
}

function orderedCategories(groups) {
  const known = CATEGORY_ORDER.map(([name]) => name.toLowerCase());
  const result = [];
  for (const [name, icon] of CATEGORY_ORDER) {
    const real = [...groups.keys()].find((k) => k.toLowerCase() === name.toLowerCase());
    if (real) result.push({ name: real, icon });
  }
  const rest = [...groups.keys()].filter((k) => !known.includes(k.toLowerCase())).sort((a, b) => a.localeCompare(b));
  rest.forEach((name) => result.push({ name, icon: "📁" }));
  return result;
}

function buildHeader({ botName, version, owner, mode, time, prefix, noPrefixOn, total, top }) {
  const lines = [
    `⭐ ${botName} ⭐`,
    "",
    `┌${RULE}`,
    `│ 📱 Bot: ${botName}`,
    `│ 🏷️ Version: ${version}`,
    `│ 👤 Owner: ${owner}`,
    `│ 🌐 Mode: ${mode}`,
    `│ ⏰ Time: ${time}`,
    `│ ℹ️ Prefix: ${prefix}${noPrefixOn ? "  (or no prefix)" : ""}`,
    `│ 📊 Commands: ${total}`,
    `└${RULE}`,
  ];
  if (top && top.length) {
    lines.push("", "🔥 TOP COMMANDS:");
    top.forEach((t, i) => lines.push(`${MEDALS[i] || "🏅"} ${prefix}${t.name} • ${t.uses} ${t.uses === 1 ? "use" : "uses"}`));
  }
  return lines.join("\n");
}

function buildSection({ name, icon }, names, prefix) {
  const lines = [`${icon} ${name.toUpperCase()}`, `┌${RULE}`];
  names.forEach((cmd, i) => lines.push(`${i === names.length - 1 ? "└" : "├"}──✔️ ${prefix}${cmd}`));
  return lines.join("\n");
}

/**
 * Splits header + sections into messages of at most `limit` characters.
 * A category is never cut in half (unless one category alone is longer than the limit).
 */
function splitMessages(header, sections, limit = MAX_MESSAGE_CHARS) {
  const messages = [];
  let current = header;
  for (const section of sections) {
    const candidate = current ? `${current}\n\n${section}` : section;
    if (candidate.length <= limit || !current) {
      current = candidate;
    } else {
      messages.push(current);
      current = section;
    }
  }
  if (current) messages.push(current);
  return messages;
}

function buildMenuMessages({ commands, prefix, info, only }) {
  const groups = groupCommands(commands);
  let categories = orderedCategories(groups);

  if (only) {
    const wanted = String(only).toLowerCase();
    categories = categories.filter((c) => c.name.toLowerCase() === wanted || c.name.toLowerCase().startsWith(wanted));
  }
  const header = buildHeader({ ...info, total: (commands || []).length });
  const sections = categories.map((c) => buildSection(c, groups.get(c.name), prefix));
  return { messages: splitMessages(header, sections), categories: categories.map((c) => c.name), available: orderedCategories(groups).map((c) => c.name) };
}

// ====== SENDING ======
/** First message: random picture from /scs, else the bot picture link, else plain text. */
async function sendFirst(client, dest, caption, mybotpic) {
  const imagePath = getRandomScsImage();
  if (imagePath) {
    try {
      const buffer = fs.readFileSync(imagePath);
      const isVideo = /\.(mp4|gif)$/i.test(imagePath);
      const content = isVideo
        ? { video: buffer, caption, gifPlayback: true, contextInfo }
        : { image: buffer, caption, contextInfo };
      return await client.sendMessage(dest, content, { quoted: quotedContact });
    } catch (e) { /* try the next option */ }
  }
  try {
    const url = typeof mybotpic === "function" ? mybotpic() : "";
    if (url) return await client.sendMessage(dest, { image: { url }, caption, contextInfo }, { quoted: quotedContact });
  } catch (e) { /* try plain text */ }
  return client.sendMessage(dest, { text: caption, contextInfo }, { quoted: quotedContact });
}

// ====== MAIN COMMAND ======
bmbtz({
  nomCom: "menu",
  categorie: "General",
  reaction: "🌚",
}, async (dest, client, commandeOptions) => {
  const { repondre, prefixe, arg, mybotpic } = commandeOptions;
  const { cm } = require(__dirname + "/../../devbmb/bmbtz");

  const settings = getCachedSettingsSync() || {};
  const prefix = prefixe || ".";
  const info = {
    botName: s.BOT,
    version: BOT_VERSION,
    owner: s.OWNER_NAME,
    mode: ownerAccess.modeLabel(settings.MODE !== undefined ? settings.MODE : s.MODE),
    time: moment().tz(process.env.TZ || "Africa/Nairobi").format("HH:mm"),
    prefix,
    noPrefixOn: noPrefix.resolveMode(settings.NOPREFIX) !== "off",
    top: cmdStats.top(3),
  };

  const only = arg && arg[0] ? arg[0] : "";
  const { messages, categories, available } = buildMenuMessages({ commands: cm, prefix, info, only });

  if (only && !categories.length) {
    return repondre(`❌ No category called "${only}".\nAvailable: ${available.join(", ")}`);
  }

  await sendFirst(client, dest, messages[0], mybotpic);
  for (const text of messages.slice(1)) {
    await client.sendMessage(dest, { text, contextInfo });
  }
});

module.exports = { buildMenuMessages, buildHeader, buildSection, splitMessages, groupCommands, orderedCategories };
