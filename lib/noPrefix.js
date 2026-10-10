"use strict";
/**
 * lib/noPrefix.js - lets people run commands WITHOUT the prefix ("menu" works like ".menu").
 *
 * Modes (setting NOPREFIX, or the NOPREFIX env var; default "on"):
 *   on    - everyone, in groups and in private chats
 *   inbox - everyone, but only in private chats (groups still need the prefix)
 *   owner - only the owner / sudo users, everywhere
 *   off   - prefix always required
 *
 * Safety rules (they keep normal chatting from triggering commands by accident):
 *   - the FIRST word of the message must be exactly a command name or alias
 *   - the message may have at most MAX_WORDS words (use the prefix for longer ones)
 *   - messages sent from the bot's own account are ignored (so the bot can never trigger itself)
 *   - messages written by other bots are ignored
 *   - normal members only get public commands; group commands need a group admin;
 *     owner / settings / mods commands need the owner or a sudo user
 */
const MAX_WORDS = 12;

const TEXT_TYPES = new Set(["conversation", "extendedTextMessage", "imageMessage", "videoMessage"]);
const PUBLIC_CATEGORIES = new Set(["general", "search", "download", "fun", "ai", "conversion", "audio-edit", "logo", "other"]);
const ADMIN_CATEGORIES = new Set(["group"]);
// Public-looking names that are still owner-only; they need the prefix unless you are the owner.
const OWNER_ONLY_NAMES = new Set(["setpp", "vv"]);

function normalizeMode(value) {
  const v = String(value == null ? "" : value).toLowerCase().trim();
  if (v === "on" || v === "yes" || v === "true" || v === "all") return "on";
  if (v === "inbox" || v === "dm" || v === "pm" || v === "private") return "inbox";
  if (v === "owner" || v === "sudo") return "owner";
  if (v === "off" || v === "no" || v === "false") return "off";
  return "on";
}

/** Setting value first, then the NOPREFIX env var, then the default ("on"). */
function resolveMode(storedValue) {
  const raw = storedValue != null && storedValue !== "" ? storedValue : process.env.NOPREFIX;
  return normalizeMode(raw);
}

function findCommand(commands, word) {
  return (commands || []).find(
    (c) => c.nomCom === word || (Array.isArray(c.alias) && c.alias.includes(word))
  );
}

/**
 * Returns the command word to run (e.g. "play"), or "" when the message is a normal chat message.
 */
function detect({ text, mtype, key, commands, mode, isGroup, isAdmin, superUser }) {
  const m = normalizeMode(mode);
  if (m === "off") return "";
  if (!text || !TEXT_TYPES.has(mtype)) return "";
  if (key && key.fromMe) return "";
  if (key && typeof key.id === "string" && key.id.length === 16 && (key.id.startsWith("BAE5") || key.id.startsWith("BAES"))) return "";

  const words = String(text).trim().split(/\s+/);
  if (!words[0] || words.length > MAX_WORDS) return "";
  const first = words[0].toLowerCase();
  if (!/^[a-z0-9_-]+$/.test(first)) return "";

  const cd = findCommand(commands, first);
  if (!cd) return "";

  if (m === "owner" && !superUser) return "";
  if (m === "inbox" && isGroup && !superUser) return "";

  if (superUser) return first;

  const category = String(cd.categorie || "").toLowerCase();
  if (OWNER_ONLY_NAMES.has(cd.nomCom)) return "";
  if (PUBLIC_CATEGORIES.has(category)) return first;
  if (ADMIN_CATEGORIES.has(category) && isGroup && isAdmin) return first;
  return "";
}

module.exports = { detect, resolveMode, normalizeMode, MAX_WORDS };
