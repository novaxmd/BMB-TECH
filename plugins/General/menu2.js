const { bmbtz, cm } = require("../../devbmb/bmbtz");
const os = require("os");
const moment = require("moment-timezone");
const s = require("../../settings");
const { getCachedSettingsSync } = require("../../lib/settingsCache");

/**
 * menu
 * Exact match to the screenshot using ┇ * ✾ ┋ decorations
 * Commands & categories in lowercase
 */
const newsletterContext = {
  contextInfo: {
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363382023564830@newsletter",
      newsletterName: "𝙱.𝙼.𝙱-𝚇𝙼𝙳",
      serverMessageId: 1
    }
  }
};

const quotedContact = {
  key: {
    fromMe: false,
    participant: `0@s.whatsapp.net`,
    remoteJid: "status@broadcast"
  },
  message: {
    contactMessage: {
      displayName: "B.M.B VERIFIED ✅",
      vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:B.M.B VERIFIED ✅\nORG:BMB-TECH BOT;\nTEL;type=CELL;type=VOICE;waid=255767862457:+255772341432\nEND:VCARD"
    }
  }
};

const readMoreChar = String.fromCharCode(8206);

bmbtz({ nomCom: "menu", alias: ["allmenu", "helplist"], categorie: "General" }, async (dest, client, commandOptions) => {
  let { ms, repondre, prefixe, nomAuteurMessage, superUser } = commandOptions;

  try {
    const commandsByCategory = {};
    cm.forEach((com) => {
      const cat = com.categorie || "General";
      if (!commandsByCategory[cat]) commandsByCategory[cat] = [];
      commandsByCategory[cat].push(com.nomCom);
    });

    const modeValue = getCachedSettingsSync().MODE ?? s.MODE;
    const mode = (modeValue || "").toLowerCase() === "on" ? "PUBLIC" : "PRIVATE";
    const ownerName = getCachedSettingsSync().OWNER_NAME ?? s.OWNER_NAME;

    // ===== HEADER =====
    let headerCard =
      `┇✾═══════════════✾\n` +
      `┇ BOT NAME: *${s.BOT}*\n` +
      `┇ COMMANDS: *${cm.length}+*\n` +
      `┇ DEV : *bmb tech*\n` +
      `┇ PLATFORM: *${os.platform().toUpperCase()}*\n` +
      `┇ OWNER : *${ownerName}*\n` +
      `┇ MODE: *${mode}*\n` +
      `┇✾═══════════════✾\n`;

    let menuBody = "";
    for (const category in commandsByCategory) {
      // ===== CATEGORY HEADER (lowercase) =====
      menuBody += `\n✾ ${category} ✾\n`;
      menuBody += `┇✾═══════════════✾\n`;

      // ===== COMMANDS (lowercase) =====
      for (const cmdName of commandsByCategory[category]) {
        menuBody += `┇ *${cmdName}*\n`;
      }

      // ===== CATEGORY FOOTER =====
      menuBody += `┇✾═══════════════✾\n`;
    }

    menuBody += `\n*B.M.B-TECH* — built to last`;

    const fullCaption = headerCard + menuBody;
    const imageUrl = s.URL;

    try {
      await client.sendMessage(dest, {
        image: { url: imageUrl },
        caption: fullCaption,
        ...newsletterContext
      }, { quoted: quotedContact });
    } catch (imgErr) {
      console.log("[menu] image send failed, falling back to text:", imgErr.message || imgErr);
      await client.sendMessage(dest, { text: fullCaption, ...newsletterContext }, { quoted: ms });
    }

  } catch (e) {
    console.log("❌ Menu error: " + e);
    repondre("❌ Menu error: " + (e.message || e));
  }
});
