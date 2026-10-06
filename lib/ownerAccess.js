"use strict";
/**
 * lib/ownerAccess.js - who is the owner, and what the bot mode allows.
 * Works like NOVA-XMD: the owner can do everything, in every chat, in every mode.
 *
 * Two kinds of "full owner" exist, and both can switch the bot between modes:
 *   - the bot's own WhatsApp number
 *   - the creator / developer number (DEV_NUMBER in index.js)
 *   - any number listed in the OWNER_NUMBER or NUMERO_OWNER env var (comma separated)
 * Sudo users (added with .addsudo) get the same command access, but cannot add or
 * remove other sudo users.
 */
const { resolveLidToJid, cacheLidPhone } = require("./lidResolver");

/** "255712345678:12@s.whatsapp.net" -> "255712345678" */
function digits(v) {
  return String(v || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

function toJid(num) {
  const d = digits(num);
  return d ? d + "@s.whatsapp.net" : "";
}

/**
 * Turns "255712345678, +255 700 000 000" (or several values) into a Set of digit strings.
 * Numbers can be separated by commas / semicolons; a list separated only by spaces also works
 * when every piece looks like a full phone number.
 */
function numberSet(...values) {
  const out = new Set();
  for (const v of values) {
    String(v || "")
      .split(/[,;\n]+/)
      .forEach((part) => {
        const tokens = part.trim().split(/\s+/).filter(Boolean);
        if (tokens.length > 1 && tokens.every((t) => digits(t).length >= 9)) {
          tokens.forEach((t) => out.add(digits(t)));
        } else {
          const d = digits(part);
          if (d.length >= 6) out.add(d);
        }
      });
  }
  return out;
}

/**
 * Groups often send the sender as "<number>@lid". Convert it to the real phone
 * number JID using the cache, then the group participant list.
 */
function resolveSenderJid(senderJid, participants) {
  if (!senderJid || !String(senderJid).endsWith("@lid")) return senderJid;
  const cached = resolveLidToJid(senderJid);
  if (cached && cached !== senderJid) return cached;

  const lidNum = digits(senderJid);
  for (const p of participants || []) {
    const ids = [p.id, p.lid, p.jid].filter(Boolean);
    if (!ids.some((x) => String(x).endsWith("@lid") && digits(x) === lidNum)) continue;
    const pn = p.phoneNumber || p.jid || (p.id && !String(p.id).endsWith("@lid") ? p.id : "");
    const pnDigits = digits(pn);
    if (pnDigits && !String(pn).endsWith("@lid")) {
      try { cacheLidPhone(lidNum, pnDigits); } catch {}
      return pnDigits + "@s.whatsapp.net";
    }
  }
  return senderJid;
}

/**
 * Decide what the sender is allowed to do.
 *   superUser  -> may run every owner command (owner, creator, bot itself, sudo)
 *   fullOwner  -> owner / creator / bot itself (may also manage sudo users)
 */
function classifySender({ senderJid, botJid, botLid, devNumber, ownerNumbers, sudoJids }) {
  const sender = digits(senderJid);
  const isLidUnresolved = String(senderJid || "").endsWith("@lid");

  const isBot = !!sender && (sender === digits(botJid) || (!!botLid && sender === digits(botLid)));
  const isDev = !!sender && !isLidUnresolved && sender === digits(devNumber);
  const owners = numberSet(...(ownerNumbers || []));
  const isEnvOwner = !!sender && !isLidUnresolved && owners.has(sender);
  const isSudo = !!sender && !isLidUnresolved && (sudoJids || []).some((j) => digits(j) === sender);

  const fullOwner = isBot || isDev || isEnvOwner;
  return { isBot, isDev, isEnvOwner, isSudo, fullOwner, superUser: fullOwner || isSudo };
}

// ---------------------------------------------------------------------
// Bot modes (MODE setting). Old values stay valid: "on" = public, "off" = private.
// ---------------------------------------------------------------------
function normalizeMode(value) {
  const v = String(value == null ? "on" : value).toLowerCase().trim();
  if (v === "on" || v === "public" || v === "yes") return "public";
  if (v === "off" || v === "private" || v === "no") return "private";
  if (v === "group" || v === "groups") return "group";
  if (v === "inbox" || v === "dm" || v === "pm") return "inbox";
  return "public";
}

/** true when a NON-owner must be ignored in this chat type. */
function modeBlocks(value, isGroup) {
  const m = normalizeMode(value);
  if (m === "private") return true;
  if (m === "group" && !isGroup) return true;
  if (m === "inbox" && isGroup) return true;
  return false;
}

const MODE_INFO = {
  public: { emoji: "🌐", label: "PUBLIC", desc: "Everyone can use commands, anywhere.", stored: "on" },
  private: { emoji: "🔒", label: "PRIVATE", desc: "Only the owner (and sudo users) can use commands.", stored: "off" },
  group: { emoji: "👥", label: "GROUP", desc: "Commands work in groups only. DMs are ignored.", stored: "group" },
  inbox: { emoji: "📩", label: "INBOX", desc: "Commands work in DMs only. Groups are ignored.", stored: "inbox" },
};

function modeLabel(value) {
  return MODE_INFO[normalizeMode(value)].label;
}

module.exports = {
  digits, toJid, numberSet,
  resolveSenderJid, classifySender,
  normalizeMode, modeBlocks, modeLabel, MODE_INFO,
};
