const { bmbtz } = require("../../devbmb/bmbtz");
const axios = require("axios");
const pkg = require("@whiskeysockets/baileys");
const { generateWAMessageFromContent, proto } = pkg;

/* ===== NEWSLETTER CONTEXT ===== */
const newsletterContext = {
  forwardingScore: 999,
  isForwarded: true,
  forwardedNewsletterMessageInfo: {
    newsletterJid: "120363382023564830@newsletter",
    newsletterName: "B.M.B TECH",
    serverMessageId: 1
  }
};

// Fake quoted contact (status style)
const quotedStatus = {
  key: {
    fromMe: false,
    participant: "0@s.whatsapp.net",
    remoteJid: "status@broadcast"
  },
  message: {
    contactMessage: {
      displayName: "B.M.B VERIFIED ✅",
      vcard: `BEGIN:VCARD
VERSION:3.0
FN:B.M.B VERIFIED
ORG:BMB-TECH;
TEL;type=CELL;type=VOICE;waid=255767862457:+255767862457
END:VCARD`
    }
  }
};

bmbtz(
  {
    nomCom: "pair",
    aliases: ["paircode", "session", "qrcode"],
    categorie: "General",
    reaction: "🔐"
  },
  async (dest, client, context) => {
    const { arg, repondre, ms } = context;

    try {
      // chukua number ya mtumiaji halisi wa WhatsApp
      const jid =
        ms.key.participant ||
        ms.participant ||
        ms.key.remoteJid;

      const senderNumber = jid.split("@")[0];

      // kama ameandika namba tumia hiyo, la sivyo tumia yake
      const number = arg[0]
        ? arg[0].replace(/\D/g, "")
        : senderNumber;

      const apiUrl = `https://bmb-pair-zone.onrender.com/code?number=${encodeURIComponent(number)}`;
      const { data } = await axios.get(apiUrl);

      if (!data || !data.code) {
        return repondre("❌ Failed to generate pair code.");
      }

      // 🔹 Caption (status style) + newsletterJid
      const caption = `
🔐 *PAIRING SUCCESSFUL* 🔐

📱 *Number:* ${number}

━━━━━━━━━━━━━━━
🔑 *PAIR CODE*
━━━━━━━━━━━━━━━
`;

      await client.sendMessage(
        dest,
        {
          text: caption,
          contextInfo: newsletterContext
        },
        { quoted: quotedStatus }
      );

      // 🔹 COPY BUTTON (CODE YA MWISHO, PEKEE, HAINA REPLY)
      const buttons = [
        {
          name: "cta_copy",
          buttonParamsJson: JSON.stringify({
            display_text: "📋 COPY PAIR CODE",
            copy_code: data.code
          })
        }
      ];

      const viewOnceMessage = {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.create({
                text: data.code
              }),
              footer: proto.Message.InteractiveMessage.Footer.create({
                text: ""
              }),
              header: proto.Message.InteractiveMessage.Header.create({
                title: "",
                subtitle: "",
                hasMediaAttachment: false
              }),
              nativeFlowMessage:
                proto.Message.InteractiveMessage.NativeFlowMessage.create({
                  buttons
                })
            })
          }
        }
      };

      const waMsg = generateWAMessageFromContent(dest, viewOnceMessage, {});
      await client.relayMessage(dest, waMsg.message, {
        messageId: waMsg.key.id
      });

    } catch (error) {
      console.error("PAIR ERROR:", error);
      repondre("❌ Error occurred while generating pair code.");
    }
  }
);
