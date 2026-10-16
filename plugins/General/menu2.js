"use strict";
/**
 * .menu - a short card with three buttons (the same idea as the Toxic-MD menu):
 *   [ FullMenu ]   -> the complete command list      (.menu1)
 *   [ Settings ]   -> the Settings commands          (.menu1 settings)
 *   [ Developer ]  -> the bot owner's contact        (.owner)
 * Tapping a button runs that command, exactly as if the person had typed it.
 */
const { bmbtz } = require("../../devbmb/bmbtz");
const moment = require("moment-timezone");
const s = require("../../settings");
const ownerAccess = require("../../lib/ownerAccess");
const noPrefix = require("../../lib/noPrefix");
const buttons = require("../../lib/buttons");
const { getCachedSettingsSync } = require("../../lib/settingsCache");

function greeting() {
  const hour = Number(moment().tz(process.env.TZ || "Africa/Nairobi").format("H"));
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Good night";
}

function buildCard({ greetingText, tag, botName, prefix, mode, noPrefixOn, commandCount }) {
  return [
    "╭─❏ 「 Mᴇɴᴜ 」",
    "│",
    `│ ${greetingText}, ${tag}`,
    "│",
    `│ Bot: ${botName}`,
    `│ Prefix: ${prefix}${noPrefixOn ? "  (or no prefix)" : ""}`,
    `│ Mode: ${mode}`,
    `│ Commands: ${commandCount}`,
    "│",
    "│ Tap a button below.",
    "╰───────────────",
  ].join("\n");
}

bmbtz({ nomCom: "menu", alias: ["helplist"], categorie: "General", reaction: "📜" }, async (dest, client, o) => {
  const { prefixe, auteurMessage, mybotpic } = o;
  const { cm } = require("../../devbmb/bmbtz");

  const settings = getCachedSettingsSync() || {};
  const prefix = prefixe || ".";
  const sender = String(auteurMessage || "");
  const tag = "@" + sender.split("@")[0].split(":")[0];

  const body = buildCard({
    greetingText: greeting(),
    tag,
    botName: s.BOT,
    prefix,
    mode: ownerAccess.modeLabel(settings.MODE !== undefined ? settings.MODE : s.MODE),
    noPrefixOn: noPrefix.resolveMode(settings.NOPREFIX) !== "off",
    commandCount: Array.isArray(cm) ? cm.length : 0,
  });

  const thumbnail = await buttons.defaultThumbnail(mybotpic);

  await buttons.sendButtons(client, dest, {
    body,
    footer: `${s.BOT} • ${s.OWNER_NAME}`,
    title: String(s.BOT),
    thumbnail,
    mentions: sender ? [sender] : [],
    buttons: [
      { text: buttons.boldFont("FullMenu"), id: `${prefix}menu1` },
      { text: buttons.boldFont("Settings"), id: `${prefix}menu1 settings` },
      { text: buttons.boldFont("Developer"), id: `${prefix}owner` },
    ],
  });
});

module.exports = { buildCard, greeting };
