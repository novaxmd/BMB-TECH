"use strict";
/**
 * eventHandler.js
 *
 * Handles group-participants.update events: welcome, goodbye,
 * anti-promote, and anti-demote.
 *
 * FIXED: WhatsApp now often reports group participants using an opaque
 * "@lid" JID instead of their real phone-number JID (see the same
 * issue documented in lib/lidResolver.js / lib/antiStatusMention.js).
 * The previous version used `group.participants[0]` directly for
 * profilePictureUrl(), @mentions, and groupParticipantsUpdate() calls
 * — when that JID was an unresolved @lid, these could silently fail
 * or behave inconsistently, which is why welcome/goodbye appeared to
 * "do nothing" even when enabled. This version resolves @lid
 * participants to their real phone JID first (falling back to the
 * raw @lid if resolution isn't possible), and wraps each step in its
 * own try/catch with logging so any remaining failures are visible in
 * the logs instead of silently swallowed.
 */
const { recupevents } = require('../lib/welcome');
const { resolveLidForStatus } = require('../lib/lidResolver');

/**
 * @param {import('@whiskeysockets/baileys').WASocket} client
 * @param {{ id: string, participants: string[], action: string, author?: string }} group
 */
async function groupEvents(client, group) {
    console.log('[eventHandler] Group participants update triggered:', JSON.stringify(group));

    try {
        const metadata = await client.groupMetadata(group.id);
        const rawMembre = group.participants[0];

        // Resolve @lid participants to their real phone JID where
        // possible — WhatsApp's newer identity system means group
        // event payloads can report members this way now.
        const resolvedMembre = rawMembre?.endsWith('@lid')
            ? await resolveLidForStatus(client, rawMembre)
            : rawMembre;

        console.log('[eventHandler] participant resolved:', rawMembre, '->', resolvedMembre);

        const membres = [resolvedMembre, ...group.participants.slice(1)];
        const groupName = metadata.subject || "Group";
        const groupDesc = metadata.desc || "no group information";

        const now = new Date();
        const date = now.toLocaleDateString('en-GB');
        const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        // 🟢 WELCOME
        if (group.action === 'add' && (await recupevents(group.id, "welcome")) === 'on') {
            let ppuser;
            try {
                ppuser = await client.profilePictureUrl(membres[0], 'image');
            } catch (error) {
                ppuser = 'https://files.catbox.moe/f9jxiv.jpg';
            }

            const customWelcome = await recupevents(group.id, "welcometext");
            let msg;
            if (customWelcome && customWelcome !== 'non') {
                msg = customWelcome
                    .replace(/{user}/g, `@${membres[0].split("@")[0]}`)
                    .replace(/{group}/g, groupName)
                    .replace(/{desc}/g, groupDesc)
                    .replace(/{date}/g, date)
                    .replace(/{time}/g, time)
                    .replace(/{count}/g, String(metadata.participants?.length || ''));
            } else {
                msg = `
╭───────────────────────━⊷
║𝗕.𝗠.𝗕-𝗧𝗘𝗖𝗛 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 𝗚𝗥𝗢𝗨𝗣
║════════════════════════
║ɢʀᴏᴜᴘ ɴᴀᴍᴇ ${groupName}
║════════════════════════
║ᴅᴀᴛᴇ ʜᴇ ᴊᴏɪɴᴇᴅ ${date}
║════════════════════════
║ᴛʜᴇ ᴛɪᴍᴇ ʜᴇ ᴇɴᴛᴇʀᴇᴅ ${time}
║════════════════════════
║ Bmb web bmbtech.zone.id
║════════════════════════
║ ${groupDesc}
╰──────────────────────━⊷`;
            }

            try {
                await client.sendMessage(group.id, {
                    image: { url: ppuser },
                    caption: msg,
                    mentions: membres
                });
                console.log('✅ Welcome message sent.');
            } catch (e) {
                console.log('❌ [eventHandler] Welcome sendMessage failed:', e.message || e);
            }
        }

        // 🔴 GOODBYE
        else if (group.action === 'remove' && (await recupevents(group.id, "goodbye")) === 'on') {
            let ppuser;
            try {
                ppuser = await client.profilePictureUrl(membres[0], 'image');
            } catch (error) {
                ppuser = 'https://files.catbox.moe/f9jxiv.jpg';
            }

            const customGoodbye = await recupevents(group.id, "goodbyetext");
            let msg;
            if (customGoodbye && customGoodbye !== 'non') {
                msg = customGoodbye
                    .replace(/{user}/g, `@${membres[0].split("@")[0]}`)
                    .replace(/{group}/g, groupName)
                    .replace(/{desc}/g, groupDesc)
                    .replace(/{date}/g, date)
                    .replace(/{time}/g, time)
                    .replace(/{count}/g, String(metadata.participants?.length || ''));
            } else {
                msg = `
╭─────────────────────────━⊷
║ɢᴏᴏᴅʙʏᴇ👋 @${membres[0].split("@")[0]}
║════════════════════════
║ᴛʜᴇ ᴛɪᴍᴇ ʜᴇ ʟᴇғᴛ ${time}
║════════════════════════
║ᴅᴀᴛᴇ ɪs ᴏᴜᴛ ${date}
║════════════════════════
║Bmb web bmbtech.zone.id
╰──────────────────────────━⊷`;
            }

            try {
                await client.sendMessage(group.id, {
                    image: { url: ppuser },
                    caption: msg,
                    mentions: membres
                });
                console.log('✅ Goodbye message sent.');
            } catch (e) {
                console.log('❌ [eventHandler] Goodbye sendMessage failed:', e.message || e);
            }
        }

        // 🛑 ANTI-PROMOTE
        else if (group.action === 'promote' && (await recupevents(group.id, "antipromote")) === 'on') {
            const rawAuthor = group.author;
            const resolvedAuthor = rawAuthor?.endsWith('@lid')
                ? await resolveLidForStatus(client, rawAuthor)
                : rawAuthor;

            if (
                resolvedAuthor === metadata.owner ||
                resolvedAuthor === client.user.id ||
                resolvedAuthor === membres[0]
            ) {
                console.log('[eventHandler] SuperUser detected, no anti-promote action taken.');
                return;
            }

            try {
                await client.groupParticipantsUpdate(group.id, [resolvedAuthor, membres[0]], "demote");
                await client.sendMessage(group.id, {
                    text: `🚫 @${resolvedAuthor.split("@")[0]} has violated the anti-promotion rule. Both @${resolvedAuthor.split("@")[0]} and @${membres[0].split("@")[0]} have been removed from administrative rights.`,
                    mentions: [resolvedAuthor, membres[0]]
                });
                console.log('❌ Anti-promotion action executed.');
            } catch (e) {
                console.log('❌ [eventHandler] Anti-promote action failed:', e.message || e);
            }
        }

        // 🟡 ANTI-DEMOTE
        else if (group.action === 'demote' && (await recupevents(group.id, "antidemote")) === 'on') {
            const rawAuthor = group.author;
            const resolvedAuthor = rawAuthor?.endsWith('@lid')
                ? await resolveLidForStatus(client, rawAuthor)
                : rawAuthor;

            if (
                resolvedAuthor === metadata.owner ||
                resolvedAuthor === client.user.id ||
                resolvedAuthor === membres[0]
            ) {
                console.log('[eventHandler] SuperUser detected, no anti-demote action taken.');
                return;
            }

            try {
                await client.groupParticipantsUpdate(group.id, [resolvedAuthor], "demote");
                await client.groupParticipantsUpdate(group.id, [membres[0]], "promote");

                await client.sendMessage(group.id, {
                    text: `🚫 @${resolvedAuthor.split("@")[0]} has violated the anti-demotion rule by removing @${membres[0].split("@")[0]}. Consequently, he has been stripped of administrative rights.`,
                    mentions: [resolvedAuthor, membres[0]]
                });
                console.log('❌ Anti-demotion action executed.');
            } catch (e) {
                console.log('❌ [eventHandler] Anti-demote action failed:', e.message || e);
            }
        }

    } catch (e) {
        console.error('❌ [eventHandler] Error handling group participants update:', e);
    }
}

module.exports = { groupEvents };
