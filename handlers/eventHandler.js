"use strict";
/**
 * eventHandler.js
 *
 * Handles group-participants.update events: welcome, goodbye,
 * anti-promote, and anti-demote.
 *
 * FIXED (again): the previous version assumed `group.participants` was
 * an array of plain JID strings (e.g. "12345@lid"). Live logs showed
 * this is no longer true — WhatsApp/Baileys now sends an array of
 * OBJECTS instead:
 *
 *   participants: [{ id: "126302740856945@lid",
 *                     phoneNumber: "255767862457@s.whatsapp.net",
 *                     admin: null }]
 *
 * Calling `.endsWith()` on one of these objects threw
 * "rawMembre?.endsWith is not a function" every single time, so
 * welcome/goodbye/antipromote/antidemote never got past that line.
 *
 * The good news: WhatsApp already includes the real phone-number JID
 * directly as `.phoneNumber` on each participant object — no LID
 * lookup needed at all when it's present. `extractJid()` below handles
 * both this new object shape AND the old plain-string shape
 * defensively, so this keeps working even if the payload shape
 * changes again in either direction.
 */
const { recupevents } = require('../lib/welcome');
const { resolveLidForStatus } = require('../lib/lidResolver');

/**
 * Pulls a usable JID string out of a participant entry, whichever
 * shape it comes in.
 * @param {string|{id?:string, jid?:string, phoneNumber?:string, phone_number?:string}} p
 */
function extractJid(p) {
    if (!p) return null;
    if (typeof p === 'string') return p;
    if (typeof p === 'object') {
        return p.phoneNumber || p.phone_number || p.id || p.jid || null;
    }
    return null;
}

/**
 * @param {import('@whiskeysockets/baileys').WASocket} client
 * @param {string} jid - possibly @lid, possibly already a phone JID
 */
async function resolveIfLid(client, jid) {
    if (jid && jid.endsWith('@lid')) {
        return resolveLidForStatus(client, jid);
    }
    return jid;
}

/**
 * @param {import('@whiskeysockets/baileys').WASocket} client
 * @param {{ id: string, participants: any[], action: string, author?: any }} group
 */
async function groupEvents(client, group) {
    console.log('[eventHandler] Group participants update triggered:', JSON.stringify(group));

    try {
        const metadata = await client.groupMetadata(group.id);

        // Extract + resolve every participant JID up front — membres is
        // now guaranteed to be an array of usable JID strings, whatever
        // shape the raw event gave us.
        const rawJids = group.participants.map(extractJid).filter(Boolean);
        const membres = [];
        for (const jid of rawJids) {
            membres.push(await resolveIfLid(client, jid));
        }

        console.log('[eventHandler] participants resolved:', JSON.stringify(rawJids), '->', JSON.stringify(membres));

        if (membres.length === 0) {
            console.log('[eventHandler] no usable participant JID found, aborting.');
            return;
        }

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
            const rawAuthor = extractJid(group.author);
            const resolvedAuthor = await resolveIfLid(client, rawAuthor);

            if (
                !resolvedAuthor ||
                resolvedAuthor === metadata.owner ||
                resolvedAuthor === client.user.id ||
                resolvedAuthor === membres[0]
            ) {
                console.log('[eventHandler] SuperUser (or no author) detected, no anti-promote action taken.');
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
            const rawAuthor = extractJid(group.author);
            const resolvedAuthor = await resolveIfLid(client, rawAuthor);

            if (
                !resolvedAuthor ||
                resolvedAuthor === metadata.owner ||
                resolvedAuthor === client.user.id ||
                resolvedAuthor === membres[0]
            ) {
                console.log('[eventHandler] SuperUser (or no author) detected, no anti-demote action taken.');
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
