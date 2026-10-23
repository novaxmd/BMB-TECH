"use strict";
/**
 * lib/buttons.js - quick-reply buttons under a message.
 *
 * Three styles (BUTTON_STYLE env var, or the owner command .buttonstyle):
 *
 *   toxic  (default) - the Toxic-MD look: every button is its own rounded button under the message,
 *                      label centred, no arrow icon. A classic "buttonsMessage" sent with relayMessage
 *                      plus the <biz><interactive type="native_flow"> node (what Toxic-MD's ButtonV2 does).
 *   native           - buttons stuck to the message with a small reply arrow. An interactiveMessage with
 *                      "quick_reply" native-flow buttons (the way plugins/General/pair.js sends its
 *                      COPY PAIR CODE button).
 *   text             - no buttons: the options are listed as commands to type.
 *
 * Whatever the style, a button tap comes back carrying the button's id; replyId() reads it and the bot
 * treats that id exactly like a typed command.
 *
 * If a style cannot be sent, the next one is tried (toxic -> native -> text), so the options are never lost.
 * If the buttons are accepted by WhatsApp but simply not shown on your phone, switch style with .buttonstyle.
 */
const fs = require("fs");
const path = require("path");

let sharp = null;
try { sharp = require("sharp"); } catch (e) { sharp = null; }

const MAX_BUTTONS = 3;
const THUMB_SIZE = 300;


// ---------------------------------------------------------------------------
// Fancy bold letters for button labels (same style as Toxic-MD): "Antilink" -> "𝐀𝐧𝐭𝐢𝐥𝐢𝐧𝐤"
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
// Reading the answer when a person taps a button / list row
// ---------------------------------------------------------------------------
function unwrap(message) {
  let m = message || {};
  for (let i = 0; i < 4; i++) {
    const inner =
      (m.ephemeralMessage && m.ephemeralMessage.message) ||
      (m.viewOnceMessage && m.viewOnceMessage.message) ||
      (m.deviceSentMessage && m.deviceSentMessage.message) ||
      (m.documentWithCaptionMessage && m.documentWithCaptionMessage.message);
    if (!inner) break;
    m = inner;
  }
  return m;
}

/** The id of the tapped button, or "" when the message is not a button answer. */
function replyId(message) {
  const m = unwrap(message);
  if (m.buttonsResponseMessage && m.buttonsResponseMessage.selectedButtonId) return m.buttonsResponseMessage.selectedButtonId;
  if (m.templateButtonReplyMessage && m.templateButtonReplyMessage.selectedId) return m.templateButtonReplyMessage.selectedId;
  if (m.listResponseMessage && m.listResponseMessage.singleSelectReply && m.listResponseMessage.singleSelectReply.selectedRowId) {
    return m.listResponseMessage.singleSelectReply.selectedRowId;
  }
  const flow = m.interactiveResponseMessage && m.interactiveResponseMessage.nativeFlowResponseMessage;
  if (flow && flow.paramsJson) {
    try {
      const parsed = typeof flow.paramsJson === "string" ? JSON.parse(flow.paramsJson) : flow.paramsJson;
      if (parsed && parsed.id) return String(parsed.id);
    } catch (e) { /* not JSON */ }
  }
  return "";
}

// ---------------------------------------------------------------------------
// Picture for the header
// ---------------------------------------------------------------------------
const thumbCache = new Map();

/** Any image (Buffer, file path or http link) -> small JPEG thumbnail, or null. */
async function makeThumbnail(source) {
  if (!source || !sharp) return null;
  const cacheKey = Buffer.isBuffer(source) ? null : String(source);
  if (cacheKey && thumbCache.has(cacheKey)) return thumbCache.get(cacheKey);
  try {
    let buffer = source;
    if (!Buffer.isBuffer(source)) {
      if (/^https?:\/\//i.test(source)) {
        const res = await fetch(source, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        buffer = Buffer.from(await res.arrayBuffer());
      } else {
        buffer = fs.readFileSync(source);
      }
    }
    const thumb = await sharp(buffer)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover", position: "center" })
      .jpeg({ quality: 70 })
      .toBuffer();
    if (cacheKey) {
      thumbCache.set(cacheKey, thumb);
      if (thumbCache.size > 12) thumbCache.delete(thumbCache.keys().next().value);
    }
    return thumb;
  } catch (e) {
    return null;
  }
}

/** A random picture from plugins/scs, else the bot picture link (mybotpic), as a thumbnail. */
async function defaultThumbnail(mybotpic) {
  try {
    const dir = path.join(__dirname, "..", "plugins", "scs");
    const files = fs.readdirSync(dir).filter((f) => /^menu\d+\.(jpg|jpeg|png)$/i.test(f));
    if (files.length) {
      const picked = path.join(dir, files[Math.floor(Math.random() * files.length)]);
      const thumb = await makeThumbnail(picked);
      if (thumb) return thumb;
    }
  } catch (e) { /* use the link below */ }
  try {
    const url = typeof mybotpic === "function" ? mybotpic() : "";
    if (url) return await makeThumbnail(url);
  } catch (e) { /* no picture */ }
  return null;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------
const STYLES = ["toxic", "native", "text"];

// This extra node is what makes WhatsApp show the classic buttons on normal accounts.
const BIZ_NODE = [
  {
    tag: "biz",
    attrs: {},
    content: [
      {
        tag: "interactive",
        attrs: { type: "native_flow", v: "1" },
        content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }],
      },
    ],
  },
];

/** The style in use: the owner's choice (.buttonstyle) first, then the BUTTON_STYLE env var, then "toxic". */
function currentStyle() {
  let value = process.env.BUTTON_STYLE;
  try {
    const stored = require("./settingsCache").getSetting("BUTTON_STYLE", "");
    if (stored) value = stored;
  } catch (e) { /* settings not available: use the env var */ }
  value = String(value || "toxic").toLowerCase().trim();
  return STYLES.includes(value) ? value : "toxic";
}

function plainTextVersion(body, footer, buttons) {
  const lines = buttons.map((b) => `• ${b.id}`);
  return `${body}\n\nType one of these:\n${lines.join("\n")}${footer ? `\n\n${footer}` : ""}`;
}

/** "toxic": a classic buttonsMessage, relayed with the native_flow node. */
async function sendToxicStyle(client, jid, { body, footer, title, subtitle, buttons, thumbnail, mentions }) {
  const { generateWAMessageFromContent } = require("@whiskeysockets/baileys");
  const contextInfo = {};
  if (mentions && mentions.length) contextInfo.mentionedJid = mentions;

  const header = thumbnail
    ? {
        headerType: 6,
        locationMessage: { degreesLatitude: 0, degreesLongitude: 0, name: title, address: subtitle, jpegThumbnail: thumbnail },
      }
    : { headerType: 1 };

  const msg = generateWAMessageFromContent(
    jid,
    {
      buttonsMessage: {
        contentText: body,
        footerText: footer,
        ...header,
        viewOnce: true,
        contextInfo,
        buttons: buttons.map((b) => ({ buttonId: b.id, buttonText: { displayText: b.text }, type: 1 })),
      },
    },
    { userJid: client.user && client.user.id }
  );
  if (typeof client.rememberSentId === "function") client.rememberSentId(msg.key.id);
  await client.relayMessage(jid, msg.message, { messageId: msg.key.id, additionalNodes: BIZ_NODE });
}

/** "native": an interactiveMessage with quick_reply native-flow buttons (the pair.js way). */
async function sendNativeStyle(client, jid, { body, footer, title, buttons, mentions }) {
  const { generateWAMessageFromContent, proto } = require("@whiskeysockets/baileys");
  const Interactive = proto.Message.InteractiveMessage;

  const interactive = Interactive.create({
    body: Interactive.Body.create({ text: body }),
    footer: Interactive.Footer.create({ text: footer }),
    header: Interactive.Header.create({ title, subtitle: "", hasMediaAttachment: false }),
    ...(mentions && mentions.length ? { contextInfo: { mentionedJid: mentions } } : {}),
    nativeFlowMessage: Interactive.NativeFlowMessage.create({
      buttons: buttons.map((b) => ({
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

/**
 * Sends a message with up to 3 buttons.
 *   buttons: [{ text: "shown on the button", id: ".command that runs when it is tapped" }]
 *   style:   optional, overrides the global style ("toxic" | "native" | "text")
 *   thumbnail: optional JPEG Buffer shown at the top (toxic style only)
 * Returns the style that was really used: "toxic", "native" or "text".
 */
async function sendButtons(client, jid, { body, footer = "", buttons, title = "", subtitle = "", mentions = [], thumbnail = null, style } = {}) {
  const list = (buttons || []).slice(0, MAX_BUTTONS);
  const asText = async () => {
    await client.sendMessage(jid, { text: plainTextVersion(body, footer, list), mentions });
    return "text";
  };

  if (!list.length || String(process.env.BUTTONS || "").toLowerCase() === "off") return asText();

  const wanted = STYLES.includes(style) ? style : currentStyle();
  if (wanted === "text") return asText();

  // The chosen style first, then the next ones, so the options are never lost.
  const order = wanted === "toxic" ? ["toxic", "native"] : ["native"];
  const args = { body, footer, title, subtitle, buttons: list, thumbnail, mentions };

  for (const name of order) {
    try {
      if (name === "toxic") await sendToxicStyle(client, jid, args);
      else await sendNativeStyle(client, jid, args);
      return name;
    } catch (e) {
      console.log(`[buttons] "${name}" style could not be sent:`, e && e.message ? e.message : e);
    }
  }
  return asText();
}

module.exports = { sendButtons, replyId, boldFont, makeThumbnail, defaultThumbnail, plainTextVersion, currentStyle, STYLES, MAX_BUTTONS };
