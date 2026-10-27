"use strict";
/**
 * plugins/Settings/buttonstyle.js - choose how the buttons look (owner only).
 *
 *   .buttonstyle           shows the style in use
 *   .buttonstyle try       sends one sample card per style, each with its name - look at them and pick
 *   .buttonstyle native    buttons stuck to the message, with a small reply arrow (default, shows everywhere)
 *   .buttonstyle toxic     separate rounded buttons like the Bmb-Tech menu (our own <biz> node)
 *   .buttonstyle wrapped   separate rounded buttons, wrapped so the library adds no second <biz> node
 *   .buttonstyle legacy    separate rounded buttons, sent with the library's own buttons API
 *   .buttonstyle text      no buttons, the commands are listed instead
 *   .buttonstyle test      sends one sample card in the style in use
 *
 * This works even when a style is not shown on your phone: the command always answers with plain text.
 */
const { bmbtz } = require("../../devbmb/bmbtz");
const { getCachedSettingsSync, updateCachedSetting } = require("../../lib/settingsCache");
const buttons = require("../../lib/buttons");

const LINE = "━━━━━━━━━━━━━━━━";
const box = (title, body) => `📌 *${title}*\n${LINE}\n${body}\n${LINE}\n© bmb tech`;

const INFO = {
  native: "Buttons stuck to the message, with a small reply arrow. Known to show.",
  toxic: "Separate rounded buttons like the Bmb-Tech menu (our own <biz> node).",
  wrapped: "Separate rounded buttons, wrapped so the library adds no second <biz> node.",
  legacy: "Separate rounded buttons, sent with the library's own buttons API.",
  text: "No buttons. The options are listed as commands to type.",
};

const sampleButtons = (p) => [
  { text: buttons.boldFont("Show Style"), id: `${p}buttonstyle` },
  { text: buttons.boldFont("Try Again"), id: `${p}buttonstyle try` },
];

bmbtz({
  nomCom: "buttonstyle",
  alias: ["btnstyle", "buttonmode"],
  categorie: "Settings",
  reaction: "🔘",
}, async (dest, client, o) => {
  const { arg, repondre, superUser, prefixe, mybotpic } = o;
  if (!superUser) return repondre("*This command is only allowed to be controlled by the owner.👤*");

  const p = prefixe || ".";
  const current = buttons.currentStyle();
  const wanted = String((arg && arg[0]) || "").toLowerCase();

  if (!wanted) {
    return repondre(box("BUTTON STYLE",
      `Current: *${current.toUpperCase()}*\n${INFO[current]}\n\n` +
      `${p}buttonstyle try      (see every style)\n` +
      `${p}buttonstyle native | toxic | wrapped | legacy | text\n` +
      `${p}buttonstyle test     (a sample in the current style)\n\n` +
      `If you can not see a card at all, send ${p}buttonstyle native.`));
  }

  // One sample card per style: look at them and keep the one that looks like Bmb-Tech.
  if (wanted === "try") {
    await repondre(box("BUTTON STYLE",
      `Sending ${buttons.STYLES.length - 1} sample cards, one per style.\n` +
      `A card that does not appear = that style does not show on your phone.\n` +
      `Then pick one, for example: ${p}buttonstyle toxic`));
    for (const style of buttons.STYLES.filter((x) => x !== "text")) {
      try {
        await buttons.sendButtons(client, dest, {
          style,
          mybotpic,
          body: `${LINE}\n🔘 Style: *${style.toUpperCase()}*\n${INFO[style]}\n\nPick it with:\n${p}buttonstyle ${style}\n${LINE}`,
          footer: `Style ${style} • BMB-TECH`,
          title: style.toUpperCase(),
          buttons: sampleButtons(p),
        });
      } catch (e) { /* the next style is still tried */ }
      await new Promise((r) => setTimeout(r, 700));
    }
    return;
  }

  if (wanted === "test") {
    const used = await buttons.sendButtons(client, dest, {
      mybotpic,
      body: `${LINE}\n🔘 Button test\nStyle: ${current.toUpperCase()}\n\nTap a button below.\n${LINE}`,
      footer: "Button test • BMB-TECH",
      title: "BUTTON TEST",
      buttons: sampleButtons(p),
    });
    if (used === "text") {
      await repondre(box("BUTTON STYLE", "The buttons could not be sent, so the options were sent as text."));
    }
    return;
  }

  if (!buttons.STYLES.includes(wanted)) {
    return repondre(box("BUTTON STYLE", `Invalid option.\nUse: ${p}buttonstyle try | native | toxic | wrapped | legacy | text | test`));
  }

  if (wanted === current && String(getCachedSettingsSync().BUTTON_STYLE || "") === wanted) {
    return repondre(box("BUTTON STYLE", `Already *${wanted.toUpperCase()}*.\n${INFO[wanted]}`));
  }
  await updateCachedSetting("BUTTON_STYLE", wanted);
  return repondre(box("BUTTON STYLE", `Now *${wanted.toUpperCase()}*.\n${INFO[wanted]}\n\nSend ${p}buttonstyle test to see it.`));
});
