"use strict";
/**
 * lib/groq.js - the single Groq caller used by the chatbot and every AI command.
 * It uses the keys from keys.js one at a time; when a key dies it moves on to the next one.
 */
const keys = require("../keys");

const CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

class GroqError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code || "GROQ_ERROR";
    this.status = status || 0;
  }
}

function hasKeys() {
  return keys.GROQ_API_KEYS.length > 0;
}

async function _request(url, buildInit, timeoutMs) {
  const order = keys.getGroqKeyOrder();
  if (!order.length) {
    throw new GroqError("No GROQ key set. Add your API keys to keys.js.", "NO_KEYS");
  }
  let lastErr = null;
  for (const key of order) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...buildInit(key), signal: ctl.signal });
      clearTimeout(timer);
      if (res.ok) {
        keys.markKeyOk(key);
        return res;
      }
      const status = res.status;
      let body = "";
      try { body = (await res.text()).slice(0, 300); } catch {}
      // Key / rate limit / server problems -> try the next key
      if (status === 401 || status === 403 || status === 429 || status >= 500) {
        keys.markKeyFailed(key, status, res.headers.get("retry-after"));
        lastErr = new GroqError(`HTTP ${status}`, "KEY_FAILED", status);
        continue;
      }
      // 400/404 etc. (bad model / bad request) - not the key's fault
      throw new GroqError(`HTTP ${status} ${body}`, "BAD_REQUEST", status);
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof GroqError) {
        if (e.code === "BAD_REQUEST") throw e;
        lastErr = e;
        continue;
      }
      // timeout / network error -> rest the key briefly, try the next one
      keys.markKeyFailed(key, 0);
      lastErr = new GroqError(e.name === "AbortError" ? "Timeout" : (e.message || "network error"), "NETWORK");
    }
  }
  throw new GroqError(
    "All GROQ keys are exhausted or down right now" + (lastErr ? ` — ${lastErr.message}` : ""),
    "ALL_KEYS_EXHAUSTED"
  );
}

/**
 * Chat completion. `models` can be a string or a list (model fallback).
 * Returns the reply text (string).
 */
async function chat({ models, messages, max_tokens = 1024, temperature = 0.7, timeoutMs = 25000 }) {
  const list = Array.isArray(models) ? models : [models];
  let lastErr = null;
  for (const model of list) {
    try {
      const res = await _request(
        CHAT_URL,
        (key) => ({
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages, max_tokens, temperature }),
        }),
        timeoutMs
      );
      const data = await res.json();
      const out = data?.choices?.[0]?.message?.content?.trim();
      if (!out) throw new GroqError("Empty response from AI.", "EMPTY");
      return out;
    } catch (e) {
      lastErr = e;
      if (e.code === "BAD_REQUEST" || e.code === "EMPTY") continue; // try the next model
      throw e; // all keys exhausted etc.
    }
  }
  throw lastErr || new GroqError("AI request failed", "UNKNOWN");
}

/** Speech-to-text (Whisper). `buffer` = audio, returns the transcribed text. */
async function transcribe(buffer, filename = "audio.ogg", mime = "audio/ogg") {
  const res = await _request(
    STT_URL,
    (key) => {
      const form = new FormData();
      form.append("file", new Blob([buffer], { type: mime }), filename);
      form.append("model", "whisper-large-v3");
      form.append("response_format", "json");
      return { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form };
    },
    60000
  );
  const data = await res.json();
  return (data?.text || "").trim();
}

module.exports = { chat, transcribe, hasKeys, GroqError };
