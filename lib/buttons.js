"use strict";
/**
 * lib/buttons.js  —  interactive options under a WhatsApp message.
 *
 * Two working styles (both confirmed to work on @whiskeysockets/baileys):
 *
 *   list    (default)  — a "Select a category" list message with a button that opens a scrollable
 *                        picker. Clean, reliable, and shows the option text exactly.
 *
 *   native             — quick-reply arrow buttons stuck to the message (the pair.js style).
 *
 *   text               — no interactive widget; the options are listed as commands to type.
 *
 * All three work on any Baileys fork. The toxic/wrapped/legacy styles are kept as aliases of
 * "native" so any stored BUTTON_STYLE value keeps working.
 *
 * Whatever the style, replyId() reads the tapped/chosen id and the bot runs it as a command.
 */
const fs = require("fs");
const path = require("path");

let sharp = null;
try { sharp = require("sharp"); } catch (e) {}

const MAX_BUTTONS = 3;
const STYLES = ["list", "native", "text", "toxic", "wrapped", "legacy"];

// ---------------------------------------------------------------------------
// Font (bold letters for labels, like Toxic-MD)
// ---------------------------------------------------------------------------
function boldFont(text) {
  return String(text).replace(/[A-Za-z0-9]/g, (ch) => {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d400 + (c - 65));
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d41a + (c - 97));
    if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7ce + (c - 48));
    return ch;
  });
}

// ---------------------------------------------------------------------------
// Reading the chosen option from a list / tapped button reply
// ---------------------------------------------------------------------------
function unwrap(message) {
  let m = message || {};
  for (let i = 0; i < 4; i++) {
    const inner = (m.ephemeralMessage && m.ephemeralMessage.message) ||
      (m.viewOnceMessage && m.viewOnceMessage.message) ||
      (m.deviceSentMessage && m.deviceSentMessage.message);
    if (!inner) break;
    m = inner;
  }
  return m;
}

function replyId(message) {
  const m = unwrap(message);
  if (m.listResponseMessage && m.listResponseMessage.singleSelectReply)
    return m.listResponseMessage.singleSelectReply.selectedRowId || "";
  if (m.buttonsResponseMessage && m.buttonsResponseMessage.selectedButtonId)
    return m.buttonsResponseMessage.selectedButtonId;
  if (m.templateButtonReplyMessage && m.templateButtonReplyMessage.selectedId)
    return m.templateButtonReplyMessage.selectedId;
  const flow = m.interactiveResponseMessage && m.interactiveResponseMessage.nativeFlowResponseMessage;
  if (flow && flow.paramsJson) {
    try {
      const p = typeof flow.paramsJson === "string" ? JSON.parse(flow.paramsJson) : flow.paramsJson;
      if (p && p.id) return String(p.id);
    } catch (e) {}
  }
  return "";
}

// ---------------------------------------------------------------------------
// Thumbnail helper
// ---------------------------------------------------------------------------
async function makeThumbnail(source) {
  if (!source) return null;
  try {
    let buf = source;
    if (!Buffer.isBuffer(buf)) {
      if (/^https?:\/\//i.test(String(buf))) {
        const res = await fetch(buf, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        buf = Buffer.from(await res.arrayBuffer());
      } else {
        buf = fs.readFileSync(buf);
      }
    }
    if (!sharp) return buf;
    return await sharp(buf).resize(300, 300, { fit: "cover" }).jpeg({ quality: 70 }).toBuffer();
  } catch (e) { return null; }
}

async function defaultThumbnail(mybotpic) {
  try {
    const dir = path.join(__dirname, "..", "plugins", "scs");
    const files = fs.readdirSync(dir).filter(f => /^menu\d+\.(jpg|jpeg|png)$/i.test(f));
    if (files.length) {
      const thumb = await makeThumbnail(path.join(dir, files[Math.floor(Math.random() * files.length)]));
      if (thumb) return thumb;
    }
  } catch (e) {}
  try {
    const url = typeof mybotpic === "function" ? mybotpic() : "";
    if (url) return await makeThumbnail(url);
  } catch (e) {}
  return null;
}

// ---------------------------------------------------------------------------
// Current style
// ---------------------------------------------------------------------------
function currentStyle() {
  let value = process.env.BUTTON_STYLE;
  try {
    const stored = require("./settingsCache").getSetting("BUTTON_STYLE", "");
    if (stored) value = stored;
  } catch (e) {}
  value = String(value || "list").toLowerCase().trim();
  // toxic/wrapped/legacy are aliases of native (they no longer work on this Baileys)
  if (["toxic", "wrapped", "legacy"].includes(value)) return "native";
  return STYLES.includes(value) ? value : "list";
}

function plainTextVersion(body, footer, btns) {
  return `${body}\n\nType one of these:\n${btns.map(b => "• " + b.id).join("\n")}${footer ? "\n\n" + footer : ""}`;
}

// ---------------------------------------------------------------------------
// List style  (sendMessage with listMessage)
// ---------------------------------------------------------------------------
async function sendListStyle(client, jid, { body, footer, title, buttons, thumbnail, mybotpic, mentions }) {
  const pic = thumbnail || await defaultThumbnail(mybotpic);

  const rows = buttons.map((b, i) => ({
    rowId: b.id,
    title: b.text,
    description: b.id,
  }));

  const listMsg = {
    text: body,
    footer: footer || "",
    title: title || "",
    buttonText: "Choose an option",
    sections: [{ title: title || "Options", rows }],
    ...(mentions && mentions.length ? { mentions } : {}),
  };

  await client.sendMessage(jid, listMsg);
  if (pic) {
    await client.sendMessage(jid, {
      image: pic,
      caption: title || body.split("\n")[0] || "BMB-TECH",
    });
  }
}

// ---------------------------------------------------------------------------
// Native style  (interactiveMessage with quick_reply)
// ---------------------------------------------------------------------------
async function sendNativeStyle(client, jid, { body, footer, title, buttons, mentions }) {
  const { generateWAMessageFromContent, proto } = require("@whiskeysockets/baileys");
  const Interactive = proto.Message.InteractiveMessage;

  const interactive = Interactive.create({
    body: Interactive.Body.create({ text: body }),
    footer: Interactive.Footer.create({ text: footer }),
    header: Interactive.Header.create({ title, subtitle: "", hasMediaAttachment: false }),
    ...(mentions && mentions.length ? { contextInfo: { mentionedJid: mentions } } : {}),
    nativeFlowMessage: Interactive.NativeFlowMessage.create({
      buttons: buttons.map(b => ({
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id }),
      })),
    }),
  });

  const content = {
    viewOnceMessage: {
      message: {
        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
        interactiveMessage: interactive,
      },
    },
  };
  const msg = generateWAMessageFromContent(jid, content, {});
  if (typeof client.rememberSentId === "function") client.rememberSentId(msg.key.id);
  await client.relayMessage(jid, msg.message, { messageId: msg.key.id });
}

// ---------------------------------------------------------------------------
// Main send function
// ---------------------------------------------------------------------------
async function sendButtons(client, jid, { body, footer = "", buttons, title = "", subtitle = "", mentions = [], thumbnail = null, style, mybotpic } = {}) {
  const list = (buttons || []).slice(0, MAX_BUTTONS);
  const asText = async () => {
    await client.sendMessage(jid, { text: plainTextVersion(body, footer, list), mentions });
    return "text";
  };

  if (!list.length || String(process.env.BUTTONS || "").toLowerCase() === "off") return asText();

  const wanted = currentStyle();
  if (wanted === "text") return asText();

  const args = { body, footer, title, subtitle, buttons: list, thumbnail, mentions, mybotpic };

  if (wanted === "list") {
    try { await sendListStyle(client, jid, args); return "list"; }
    catch (e) {
      console.log("[buttons] list style failed:", e && e.message ? e.message : e);
      try { await sendNativeStyle(client, jid, args); return "native"; }
      catch (e2) { return asText(); }
    }
  }

  // native (or any alias)
  try { await sendNativeStyle(client, jid, args); return "native"; }
  catch (e) {
    console.log("[buttons] native style failed:", e && e.message ? e.message : e);
    return asText();
  }
}

module.exports = { sendButtons, replyId, boldFont, makeThumbnail, defaultThumbnail, currentStyle, STYLES, MAX_BUTTONS };
