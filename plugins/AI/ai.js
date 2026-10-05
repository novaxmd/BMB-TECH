"use strict";
/**
 * plugins/AI/ai.js - all BMB-TECH AI commands (ported from NOVA-XMD plugins/AI)
 *   gpt, chat, groq, gemini, vision, aicode, stt, imagine, sora, aikeys
 * All of them use keys.js through lib/groq.js (when one key dies, the next one takes over).
 */
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { bmbtz } = require("../../devbmb/bmbtz");
const groq = require("../../lib/groq");
const mem = require("../../lib/aiMemory");
const keys = require("../../keys");

const LINE = "━━━━━━━━━━━━━━━━";
const box = (title, body) => `${title}\n${LINE}\n${body}\n${LINE}\n© bmb tech`;
const react = (client, dest, ms, emoji) =>
  client.sendMessage(dest, { react: { text: emoji, key: ms.key } }).catch(() => {});

const NO_KEY_MSG = "No GROQ key set. Add your API keys to keys.js (or set GROQ_KEY_1 in env vars).";

/** Shared template for the text commands (gpt / groq / gemini). */
function textCommand({ nomCom, alias, title, system, usage, maxTokens = 1024, temperature = 0.7, errTitle }) {
  bmbtz({ nomCom, alias: alias || [], categorie: "AI", reaction: "🤖" }, async (dest, client, o) => {
    const { arg, ms, repondre, prefixe } = o;
    const text = (arg || []).join(" ").trim();
    await react(client, dest, ms, "⌛");
    if (!text) {
      await react(client, dest, ms, "❌");
      return repondre(box("❌ *ERROR*", usage.replace("{p}", prefixe || ".")));
    }
    if (!groq.hasKeys()) {
      await react(client, dest, ms, "❌");
      return repondre(box("❌ *ERROR*", NO_KEY_MSG));
    }
    try {
      const reply = await groq.chat({
        models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
        messages: [{ role: "system", content: system }, { role: "user", content: text }],
        max_tokens: maxTokens,
        temperature,
      });
      await react(client, dest, ms, "✅");
      await client.sendMessage(dest, { text: box(title, reply) }, { quoted: ms });
    } catch (e) {
      console.log(`${nomCom} error:`, e.message);
      await react(client, dest, ms, "❌");
      await repondre(box("❌ *ERROR*", `${errTitle}\n${e.message}`));
    }
  });
}

// ---------------------------------------------------------------------
// .gpt
// ---------------------------------------------------------------------
textCommand({
  nomCom: "gpt",
  alias: ["gpt4", "gpt5", "ai", "askgpt", "ask"],
  title: "🤖 *GPT RESPONSE*",
  system: "You are a highly capable AI assistant. Answer accurately and concisely.",
  usage: "Type a prompt, genius.\nExample: {p}gpt what is AI?",
  errTitle: "AI choked. Classic.",
});

// ---------------------------------------------------------------------
// .groq
// ---------------------------------------------------------------------
textCommand({
  nomCom: "groq",
  alias: ["groqai"],
  title: "📌 *GROQ RESPONSE*",
  system: "You are a helpful AI assistant powered by Groq's ultra-fast inference. Answer simply and clearly.",
  usage: "Provide a query, you walnut.\nExample: {p}groq explain gravity",
  errTitle: "Groq failed.",
});

// ---------------------------------------------------------------------
// .gemini
// ---------------------------------------------------------------------
textCommand({
  nomCom: "gemini",
  alias: ["bard", "geminiai"],
  title: "📌 *GEMINI RESPONSE*",
  system: "You are Gemini, Google's most advanced AI. Be thorough, accurate, and slightly sophisticated in your answers.",
  usage: "Give me something to work with.\nExample: {p}gemini What is AI?",
  errTitle: "Gemini crashed.",
});

// ---------------------------------------------------------------------
// .chat - conversation with memory
// ---------------------------------------------------------------------
bmbtz({ nomCom: "chat", alias: ["chatai", "talk"], categorie: "AI", reaction: "📌" }, async (dest, client, o) => {
  const { arg, ms, repondre, prefixe, auteurMessage } = o;
  const text = (arg || []).join(" ").trim();
  const uid = String(auteurMessage || "").split("@")[0].split(":")[0];
  await react(client, dest, ms, "⌛");

  if (!text) {
    await react(client, dest, ms, "❌");
    return repondre(box("❌ *ERROR*", `Give me something to work with.\nChats are stored for context.\nTo clear history: ${prefixe || "."}chat --reset`));
  }
  if (text.toLowerCase().includes("--reset")) {
    mem.clearHistory(uid);
    await react(client, dest, ms, "✅");
    return repondre(box("📌 *CHAT RESET*", "Conversation history cleared."));
  }
  if (!groq.hasKeys()) {
    await react(client, dest, ms, "❌");
    return repondre(box("❌ *ERROR*", NO_KEY_MSG));
  }
  try {
    const history = mem.getHistory(uid).slice(-10);
    const reply = await groq.chat({
      models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
      messages: [
        { role: "system", content: "You are a highly intelligent AI assistant with memory. Be helpful, accurate, and conversational." },
        ...history,
        { role: "user", content: text },
      ],
      max_tokens: 1024,
    });
    mem.addMessage(uid, "user", text);
    mem.addMessage(uid, "assistant", reply);
    await react(client, dest, ms, "✅");
    await client.sendMessage(dest, { text: box("📌 *CHAT*", reply) }, { quoted: ms });
  } catch (e) {
    console.log("chat error:", e.message);
    await react(client, dest, ms, "❌");
    await repondre(box("❌ *ERROR*", e.message));
  }
});

// ---------------------------------------------------------------------
// .aicode <language> <description>
// ---------------------------------------------------------------------
bmbtz({ nomCom: "aicode", alias: ["codeai", "gencode"], categorie: "AI", reaction: "💻" }, async (dest, client, o) => {
  const { arg, ms, repondre, prefixe } = o;
  await react(client, dest, ms, "⌛");
  const p = prefixe || ".";
  if (!arg || arg.length < 2) {
    await react(client, dest, ms, "❌");
    return repondre(box("❌ *ERROR*", `Provide a language and prompt.\nUsage: ${p}aicode <language> <prompt>\nExample: ${p}aicode python hello world`));
  }
  if (!groq.hasKeys()) {
    await react(client, dest, ms, "❌");
    return repondre(box("❌ *ERROR*", NO_KEY_MSG));
  }
  const language = arg[0];
  const prompt = arg.slice(1).join(" ");
  try {
    const code = await groq.chat({
      models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
      messages: [
        { role: "system", content: `You are an expert ${language} programmer. Generate clean, working code with no markdown formatting, no backticks, no explanations — just the raw code. Output ONLY the code itself.` },
        { role: "user", content: prompt },
      ],
      max_tokens: 1500,
      temperature: 0.2,
    });
    await react(client, dest, ms, "✅");
    await client.sendMessage(dest, { text: box("🤖 *AI CODE*", `Language: ${language}\n\n${code}`) }, { quoted: ms });
  } catch (e) {
    console.log("aicode error:", e.message);
    await react(client, dest, ms, "❌");
    await repondre(box("❌ *ERROR*", `Code generation failed. ${e.message}`));
  }
});

// ---------------------------------------------------------------------
// .vision - describe an image (reply to an image, or send an image with the caption .vision)
// ---------------------------------------------------------------------
bmbtz({ nomCom: "vision", alias: ["analyze", "describe", "aiimg"], categorie: "AI", reaction: "🖼️" }, async (dest, client, o) => {
  const { arg, ms, repondre, msgRepondu } = o;
  await react(client, dest, ms, "⌛");
  const img = msgRepondu?.imageMessage || ms.message?.imageMessage;
  if (!img) {
    await react(client, dest, ms, "❌");
    return repondre(box("❌ *ERROR*", "Quote an image first, genius."));
  }
  if (!groq.hasKeys()) {
    await react(client, dest, ms, "❌");
    return repondre(box("❌ *ERROR*", NO_KEY_MSG));
  }
  try {
    const stream = await downloadContentFromMessage(img, "image");
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    const b64 = Buffer.concat(chunks).toString("base64");
    const mime = img.mimetype || "image/jpeg";
    const prompt = (arg || []).join(" ").trim() || "Describe this image in detail. Be thorough but concise.";
    const result = await groq.chat({
      models: ["meta-llama/llama-4-scout-17b-16e-instruct", "llama-3.2-90b-vision-preview", "llama-3.2-11b-vision-preview"],
      messages: [{ role: "user", content: [
        { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
        { type: "text", text: prompt },
      ] }],
      max_tokens: 1024,
      timeoutMs: 40000,
    });
    await react(client, dest, ms, "✅");
    await client.sendMessage(dest, { text: box("🖼️ *IMAGE ANALYSIS*", result) }, { quoted: ms });
  } catch (e) {
    console.log("vision error:", e.message);
    await react(client, dest, ms, "❌");
    await repondre(box("📌 *FAILED*", `Vision analysis failed.\n${e.message}`));
  }
});

// ---------------------------------------------------------------------
// .stt - voice note -> text (Whisper)
// ---------------------------------------------------------------------
bmbtz({ nomCom: "stt", alias: ["transcribe", "speechtotext", "voicetotext"], categorie: "AI", reaction: "👂" }, async (dest, client, o) => {
  const { ms, repondre, msgRepondu } = o;
  await react(client, dest, ms, "⌛");
  const audio = msgRepondu?.audioMessage || ms.message?.audioMessage;
  if (!audio) {
    await react(client, dest, ms, "❌");
    return repondre(box("📌 *STT*", "Reply to a voice note or audio message,\nyou muppet. I'm not magic — I can't\ntranscribe thin air."));
  }
  if (!groq.hasKeys()) {
    await react(client, dest, ms, "❌");
    return repondre(box("📌 *STT*", NO_KEY_MSG));
  }
  await react(client, dest, ms, "👂");
  try {
    const stream = await downloadContentFromMessage(audio, "audio");
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    const text = await groq.transcribe(Buffer.concat(chunks), "audio.ogg", "audio/ogg");
    if (!text) {
      await react(client, dest, ms, "❌");
      return repondre(box("📌 *STT*", "I listened to that rubbish and got\nabsolutely nothing. Either you mumbled\nor you sent silence."));
    }
    await react(client, dest, ms, "✅");
    await client.sendMessage(dest, { text: box("📌 *STT*", `👂 *Transcription:*\n${text}\n_You're welcome. Now learn to type\nnext time._`) }, { quoted: ms });
  } catch (e) {
    console.log("stt error:", e.message);
    await react(client, dest, ms, "❌");
    await repondre(box("📌 *STT*", `Transcription crashed.\nError: ${e.message}`));
  }
});

// ---------------------------------------------------------------------
// .imagine / .sora - AI images (Pollinations, no key needed)
// ---------------------------------------------------------------------
async function pollImage(prompt, w, h) {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&seed=${Math.floor(Math.random() * 999999)}`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 60000);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`Image generation failed: ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(t); }
}

bmbtz({ nomCom: "imagine", alias: ["aiimage", "dream", "generate"], categorie: "AI", reaction: "🎨" }, async (dest, client, o) => {
  const { arg, ms, repondre, prefixe } = o;
  const prompt = (arg || []).join(" ").trim();
  await react(client, dest, ms, "⌛");
  if (!prompt) {
    await react(client, dest, ms, "❌");
    return repondre(box("❌ *ERROR*", `Forgot the prompt? Typical.\nExample: ${prefixe || "."}imagine a cat playing football`));
  }
  try {
    const image = await pollImage(prompt, 768, 768);
    await react(client, dest, ms, "✅");
    await client.sendMessage(dest, { image, caption: box("🤖 *AI IMAGE*", `Prompt: ${prompt}\nPowered by BMB-TECH`) }, { quoted: ms });
  } catch (e) {
    console.log("imagine error:", e.message);
    await react(client, dest, ms, "❌");
    await repondre(box("📌 *FAILED*", `Image generation failed.\n${e.message}`));
  }
});

bmbtz({ nomCom: "sora", alias: ["soraai", "genvideo", "aifilm"], categorie: "AI", reaction: "🎬" }, async (dest, client, o) => {
  const { arg, ms, repondre, prefixe } = o;
  const prompt = (arg || []).join(" ").trim();
  await react(client, dest, ms, "⌛");
  if (!prompt) {
    await react(client, dest, ms, "❌");
    return repondre(box("🤖 *SORA AI*", `Describe a scene to generate.\nExample: ${prefixe || "."}sora a dragon flying over Tokyo`));
  }
  try {
    const image = await pollImage(`cinematic film scene, ultra detailed, 8k, ${prompt}, dramatic lighting, movie quality, epic composition`, 1280, 720);
    await react(client, dest, ms, "✅");
    await client.sendMessage(dest, { image, caption: box("🤖 *SORA AI SCENE*", `Prompt: ${prompt}\nResolution: 1280×720`) }, { quoted: ms });
  } catch (e) {
    console.log("sora error:", e.message);
    await react(client, dest, ms, "❌");
    await repondre(box("📌 *FAILED*", "Could not generate scene.\nTry a different prompt."));
  }
});

// ---------------------------------------------------------------------
// .aikeys - key status (owner only, keys are never shown in full)
// ---------------------------------------------------------------------
bmbtz({ nomCom: "aikeys", alias: ["keystatus", "groqkeys"], categorie: "AI", reaction: "🔑" }, async (dest, client, o) => {
  const { ms, repondre, superUser } = o;
  if (!superUser) return repondre("*This command is only allowed to be controlled by the owner.👤*");
  const list = keys.getKeyStatus();
  if (!list.length) return repondre(box("🔑 *AI KEYS*", "No keys configured.\nAdd them in keys.js"));
  const lines = list.map((k) =>
    `${k.ok ? "✅" : "⏳"} #${k.index} ${k.key}  | ok:${k.uses} fail:${k.fails}` +
    (k.ok ? "" : ` | back in ${k.resumesInSec}s (${k.lastError})`)
  );
  await client.sendMessage(dest, { text: box("🔑 *AI KEYS*", `Total: ${list.length}\n${lines.join("\n")}`) }, { quoted: ms });
});
