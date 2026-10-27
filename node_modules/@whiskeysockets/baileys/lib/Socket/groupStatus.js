import crypto from 'crypto';
import { proto } from '../../WAProto/index.js';
import { delay, generateMessageID, generateWAMessage, generateWAMessageContent, generateWAMessageFromContent, prepareWAMessageMedia } from '../Utils/index.js';
import { isJidGroup, isPnUser, jidNormalizedUser, STORIES_JID } from '../WABinary/index.js';
export class ToxicHandler {
    constructor(waUploadToServer, relayMessageFn, config, sock) {
        this.relayMessage = relayMessageFn;
        this.waUploadToServer = waUploadToServer;
        this.config = config;
        this.sock = sock;
    }
    detectType(content) {
        if (content.requestPaymentMessage)
            return 'PAYMENT';
        if (content.productMessage)
            return 'PRODUCT';
        if (content.interactiveButtons)
            return 'INTERACTIVE_BUTTONS';
        if (content.interactiveMessage)
            return 'INTERACTIVE';
        if (content.albumMessage || content.album)
            return 'ALBUM';
        if (content.eventMessage)
            return 'EVENT';
        if (content.pollResultMessage)
            return 'POLL_RESULT';
        if (content.groupStatusMessage)
            return 'GROUP_STORY';
        return null;
    }
    async handlePayment(content, quoted) {
        const data = content.requestPaymentMessage;
        let notes = {};
        if (data.sticker?.stickerMessage) {
            notes = {
                stickerMessage: {
                    ...data.sticker.stickerMessage,
                    contextInfo: {
                        stanzaId: quoted?.key?.id,
                        participant: quoted?.key?.participant || content.sender,
                        quotedMessage: quoted?.message
                    }
                }
            };
        }
        else if (data.note) {
            notes = {
                extendedTextMessage: {
                    text: data.note,
                    contextInfo: {
                        stanzaId: quoted?.key?.id,
                        participant: quoted?.key?.participant || content.sender,
                        quotedMessage: quoted?.message
                    }
                }
            };
        }
        return {
            requestPaymentMessage: proto.Message.RequestPaymentMessage.fromObject({
                expiryTimestamp: data.expiry || 0,
                amount1000: data.amount || 0,
                currencyCodeIso4217: data.currency || 'IDR',
                requestFrom: data.from || '0@s.whatsapp.net',
                noteMessage: notes,
                background: data.background ?? {
                    id: 'DEFAULT',
                    placeholderArgb: 0xfff0f0f0
                }
            })
        };
    }
    async handleProduct(content, jid, quoted) {
        const { title, description, thumbnail, productId, retailerId, url, body = '', footer = '', buttons = [], priceAmount1000 = null, currencyCode = 'IDR' } = content.productMessage;
        let productImage;
        if (Buffer.isBuffer(thumbnail)) {
            const result = await prepareWAMessageMedia({ image: thumbnail }, { upload: this.waUploadToServer });
            productImage = result.imageMessage ?? undefined;
        }
        else if (typeof thumbnail === 'object' && thumbnail?.url) {
            const result = await prepareWAMessageMedia({ image: { url: thumbnail.url } }, { upload: this.waUploadToServer });
            productImage = result.imageMessage ?? undefined;
        }
        return {
            viewOnceMessage: {
                message: {
                    interactiveMessage: {
                        body: { text: body },
                        footer: { text: footer },
                        header: {
                            title,
                            hasMediaAttachment: true,
                            productMessage: {
                                product: {
                                    productImage,
                                    productId,
                                    title,
                                    description,
                                    currencyCode,
                                    priceAmount1000,
                                    retailerId,
                                    url,
                                    productImageCount: 1
                                },
                                businessOwnerJid: '0@s.whatsapp.net'
                            }
                        },
                        nativeFlowMessage: { buttons }
                    }
                }
            }
        };
    }
    async handleInteractiveButtons(content, _jid, _quoted) {
        const { text, caption, title, subtitle, footer, interactiveButtons, hasMediaAttachment, image, video, document: docFile, mimetype, jpegThumbnail, location, product, businessOwnerJid } = content;
        const bodyText = text || caption || '';
        const buttons = interactiveButtons.map(btn => ({
            name: btn.name,
            buttonParamsJson: typeof btn.buttonParamsJson === 'string' ? btn.buttonParamsJson : JSON.stringify(btn.buttonParamsJson)
        }));
        let headerContent = {};
        let mediaAttached = typeof hasMediaAttachment === 'boolean' ? hasMediaAttachment : false;
        if (image) {
            const src = typeof image === 'object' && image.url ? { image: { url: image.url } } : { image };
            const uploaded = await prepareWAMessageMedia(src, { upload: this.waUploadToServer });
            headerContent = { ...uploaded };
            mediaAttached = typeof hasMediaAttachment === 'boolean' ? hasMediaAttachment : true;
        }
        else if (video) {
            const src = typeof video === 'object' && video.url ? { video: { url: video.url } } : { video };
            const uploaded = await prepareWAMessageMedia(src, { upload: this.waUploadToServer });
            headerContent = { ...uploaded };
            mediaAttached = typeof hasMediaAttachment === 'boolean' ? hasMediaAttachment : true;
        }
        else if (docFile) {
            const docPayload = typeof docFile === 'object' && docFile.url ? { document: { url: docFile.url } } : { document: docFile };
            if (mimetype)
                docPayload.mimetype = mimetype;
            const uploaded = await prepareWAMessageMedia(docPayload, { upload: this.waUploadToServer });
            if (jpegThumbnail) {
                uploaded.documentMessage.jpegThumbnail = typeof jpegThumbnail === 'string' ? Buffer.from(jpegThumbnail, 'base64') : jpegThumbnail;
            }
            headerContent = { ...uploaded };
            mediaAttached = typeof hasMediaAttachment === 'boolean' ? hasMediaAttachment : true;
        }
        else if (location) {
            headerContent = {
                locationMessage: {
                    degreesLatitude: location.degressLatitude || location.degreesLatitude || 0,
                    degreesLongitude: location.degressLongitude || location.degreesLongitude || 0,
                    name: location.name || ''
                }
            };
            mediaAttached = typeof hasMediaAttachment === 'boolean' ? hasMediaAttachment : true;
        }
        else if (product) {
            let productImage;
            if (product.productImage) {
                const imgSrc = typeof product.productImage === 'object' && product.productImage.url
                    ? { image: { url: product.productImage.url } }
                    : { image: product.productImage };
                const uploaded = await prepareWAMessageMedia(imgSrc, { upload: this.waUploadToServer });
                productImage = uploaded.imageMessage;
            }
            headerContent = {
                productMessage: {
                    product: {
                        productImage,
                        productId: product.productId,
                        title: product.title,
                        description: product.description,
                        currencyCode: product.currencyCode || 'IDR',
                        priceAmount1000: product.priceAmount1000,
                        retailerId: product.retailerId,
                        url: product.url,
                        productImageCount: product.productImageCount || 1
                    },
                    businessOwnerJid: businessOwnerJid || '0@s.whatsapp.net'
                }
            };
            mediaAttached = typeof hasMediaAttachment === 'boolean' ? hasMediaAttachment : true;
        }
        const interactiveMessage = {
            body: { text: bodyText },
            footer: { text: footer || '' },
            header: {
                title: title || '',
                subtitle: subtitle || '',
                hasMediaAttachment: mediaAttached,
                ...headerContent
            },
            nativeFlowMessage: { buttons }
        };
        return {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                        messageSecret: crypto.randomBytes(32)
                    },
                    interactiveMessage
                }
            }
        };
    }
    async handleInteractive(content, jid, quoted) {
        const { title, body, footer, thumbnail, image, video, document: docFile, mimetype, fileName, jpegThumbnail, contextInfo, externalAdReply, buttons = [], nativeFlowMessage, header } = content.interactiveMessage;
        const bodyText = typeof body === 'object' && body?.text ? body.text : (typeof body === 'string' ? body : (title || ''));
        const footerText = typeof footer === 'object' && footer?.text ? footer.text : (typeof footer === 'string' ? footer : '');
        const resolvedButtons = buttons?.length > 0 ? buttons : (nativeFlowMessage?.buttons || []);
        let media = null;
        let mediaType = null;
        if (thumbnail) {
            media = await prepareWAMessageMedia({ image: { url: thumbnail } }, { upload: this.waUploadToServer });
            mediaType = 'image';
        }
        else if (image) {
            media = await prepareWAMessageMedia(typeof image === 'object' && image?.url ? { image: { url: image.url } } : { image }, { upload: this.waUploadToServer });
            mediaType = 'image';
        }
        else if (video) {
            media = await prepareWAMessageMedia(typeof video === 'object' && video?.url ? { video: { url: video.url } } : { video }, { upload: this.waUploadToServer });
            mediaType = 'video';
        }
        else if (docFile) {
            const documentPayload = { document: docFile };
            if (jpegThumbnail) {
                documentPayload.jpegThumbnail = typeof jpegThumbnail === 'object' && jpegThumbnail?.url
                    ? { url: jpegThumbnail.url }
                    : jpegThumbnail;
            }
            media = await prepareWAMessageMedia(documentPayload, { upload: this.waUploadToServer });
            if (fileName && media?.documentMessage)
                media.documentMessage.fileName = fileName;
            if (mimetype && media?.documentMessage)
                media.documentMessage.mimetype = mimetype;
            mediaType = 'document';
        }
        const interactiveMessage = {
            body: { text: bodyText },
            footer: { text: footerText }
        };
        if (resolvedButtons?.length > 0) {
            interactiveMessage.nativeFlowMessage = {
                ...(nativeFlowMessage || {}),
                buttons: resolvedButtons
            };
        }
        else if (nativeFlowMessage) {
            interactiveMessage.nativeFlowMessage = nativeFlowMessage;
        }
        if (media) {
            interactiveMessage.header = {
                title: header || '',
                hasMediaAttachment: true,
                ...media
            };
        }
        else {
            interactiveMessage.header = {
                title: header || '',
                hasMediaAttachment: false
            };
        }
        const finalContextInfo = {};
        if (contextInfo) {
            Object.assign(finalContextInfo, {
                mentionedJid: contextInfo.mentionedJid || [],
                forwardingScore: contextInfo.forwardingScore || 0,
                isForwarded: contextInfo.isForwarded || false,
                ...contextInfo
            });
        }
        if (externalAdReply) {
            finalContextInfo.externalAdReply = {
                title: externalAdReply.title || '',
                body: externalAdReply.body || '',
                mediaType: externalAdReply.mediaType || 1,
                thumbnailUrl: externalAdReply.thumbnailUrl || '',
                mediaUrl: externalAdReply.mediaUrl || '',
                sourceUrl: externalAdReply.sourceUrl || '',
                showAdAttribution: externalAdReply.showAdAttribution || false,
                renderLargerThumbnail: externalAdReply.renderLargerThumbnail || false,
                ...externalAdReply
            };
        }
        if (Object.keys(finalContextInfo).length > 0) {
            interactiveMessage.contextInfo = finalContextInfo;
        }
        return { interactiveMessage };
    }
    async handleAlbum(content, jid, quoted) {
        const array = content.albumMessage || content.album;
        const ctxInfo = content.contextInfo || {};
        const userJid = jidNormalizedUser(this.sock.authState?.creds?.me?.id || '');
        const album = await generateWAMessageFromContent(jid, {
            messageContextInfo: {
                messageSecret: crypto.randomBytes(32)
            },
            albumMessage: {
                expectedImageCount: array.filter(a => 'image' in a).length,
                expectedVideoCount: array.filter(a => 'video' in a).length
            }
        }, { userJid });
        await this.relayMessage(jid, album.message, { messageId: album.key.id });
        for (let item of array) {
            if (ctxInfo && Object.keys(ctxInfo).length > 0 && !item.contextInfo) {
                item = { ...item, contextInfo: ctxInfo };
            }
            const img = await generateWAMessage(jid, item, {
                upload: this.waUploadToServer,
                userJid
            });
            img.message.messageContextInfo = {
                messageSecret: crypto.randomBytes(32),
                messageAssociation: {
                    associationType: 1,
                    parentMessageKey: album.key
                }
            };
            await this.relayMessage(jid, img.message, { messageId: img.key.id });
        }
        return album;
    }
    async handleEvent(content, jid, quoted) {
        const eventData = content.eventMessage;
        const userJid = jidNormalizedUser(this.sock.authState?.creds?.me?.id || '');
        const msg = await generateWAMessageFromContent(jid, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2,
                        messageSecret: crypto.randomBytes(32),
                        supportPayload: JSON.stringify({
                            version: 2,
                            is_ai_message: true,
                            should_show_system_message: true,
                            ticket_id: crypto.randomBytes(16).toString('hex')
                        })
                    },
                    eventMessage: {
                        contextInfo: {
                            mentionedJid: [jid],
                            participant: jid,
                            remoteJid: 'status@broadcast'
                        },
                        isCanceled: eventData.isCanceled || false,
                        name: eventData.name,
                        description: eventData.description,
                        location: eventData.location || {
                            degreesLatitude: 0,
                            degreesLongitude: 0,
                            name: 'Location'
                        },
                        joinLink: eventData.joinLink || '',
                        startTime: typeof eventData.startTime === 'string'
                            ? parseInt(eventData.startTime)
                            : eventData.startTime || Date.now(),
                        endTime: typeof eventData.endTime === 'string'
                            ? parseInt(eventData.endTime)
                            : eventData.endTime || Date.now() + 3600000,
                        extraGuestsAllowed: eventData.extraGuestsAllowed !== false
                    }
                }
            }
        }, { quoted, userJid });
        await this.relayMessage(jid, msg.message, { messageId: msg.key.id });
        return msg;
    }
    async handlePollResult(content, jid, quoted) {
        const pollData = content.pollResultMessage;
        const userJid = jidNormalizedUser(this.sock.authState?.creds?.me?.id || '');
        const msg = await generateWAMessageFromContent(jid, {
            pollResultSnapshotMessage: {
                name: pollData.name,
                pollVotes: pollData.pollVotes.map((vote) => ({
                    optionName: vote.optionName,
                    optionVoteCount: typeof vote.optionVoteCount === 'number'
                        ? vote.optionVoteCount.toString()
                        : vote.optionVoteCount
                }))
            }
        }, { userJid, quoted });
        await this.relayMessage(jid, msg.message, { messageId: msg.key.id });
        return msg;
    }
    async handleGroupStory(content, jid, quoted) {
        const storyData = content.groupStatusMessage;
        let waMsgContent;
        if (storyData.message) {
            waMsgContent = storyData;
        }
        else {
            waMsgContent = await generateWAMessageContent(storyData, {
                upload: this.waUploadToServer
            });
        }
        const msgPayload = {
            groupStatusMessageV2: {
                message: waMsgContent.message || waMsgContent
            }
        };
        return this.relayMessage(jid, msgPayload, { messageId: generateMessageID() });
    }
    async sendStatusWhatsApp(content, jids = []) {
        const userJid = jidNormalizedUser(this.sock.authState.creds.me.id);
        const allUsers = new Set([userJid]);
        for (const id of jids) {
            if (isJidGroup(id)) {
                try {
                    const metadata = (this.config.cachedGroupMetadata ? await this.config.cachedGroupMetadata(id) : undefined) ?? await this.sock.groupMetadata(id);
                    for (const p of metadata.participants) {
                        allUsers.add(jidNormalizedUser(p.id));
                    }
                }
                catch (error) {
                    this.config.logger.error(`Error getting metadata for group ${id}: ${error}`);
                }
            }
            else if (isPnUser(id)) {
                allUsers.add(jidNormalizedUser(id));
            }
        }
        const uniqueUsers = Array.from(allUsers);
        const getRandomHexColor = () => '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
        const isMedia = content.image || content.video || content.audio;
        const isAudio = !!content.audio;
        const messageContent = { ...content };
        if (isMedia && !isAudio) {
            if (messageContent.text) {
                messageContent.caption = messageContent.text;
                delete messageContent.text;
            }
            delete messageContent.ptt;
            delete messageContent.font;
            delete messageContent.backgroundColor;
            delete messageContent.textColor;
        }
        if (isAudio) {
            delete messageContent.text;
            delete messageContent.caption;
            delete messageContent.font;
            delete messageContent.textColor;
        }
        const font = !isMedia ? (content.font ?? Math.floor(Math.random() * 9)) : undefined;
        const textColor = !isMedia ? (content.textColor ?? getRandomHexColor()) : undefined;
        const backgroundColor = !isMedia || isAudio ? (content.backgroundColor ?? getRandomHexColor()) : undefined;
        const ptt = isAudio ? (typeof content.ptt === 'boolean' ? content.ptt : true) : undefined;
        const { getUrlInfo } = await import('../Utils/link-preview.js');
        const msg = await generateWAMessage(STORIES_JID, messageContent, {
            logger: this.config.logger,
            userJid,
            getUrlInfo: (text) => getUrlInfo(text, {
                thumbnailWidth: this.config.linkPreviewImageThumbnailWidth,
                fetchOpts: { timeout: 3000, ...(this.config.options || {}) },
                logger: this.config.logger,
                uploadImage: this.config.generateHighQualityLinkPreview ? this.waUploadToServer : undefined
            }),
            upload: this.waUploadToServer,
            mediaCache: this.config.mediaCache,
            options: this.config.options,
            font,
            textColor,
            backgroundColor,
            ptt
        });
        await this.relayMessage(STORIES_JID, msg.message, {
            messageId: msg.key.id,
            statusJidList: uniqueUsers,
            additionalNodes: [
                {
                    tag: 'meta',
                    attrs: {},
                    content: [
                        {
                            tag: 'mentioned_users',
                            attrs: {},
                            content: jids.map(id => ({
                                tag: 'to',
                                attrs: { jid: jidNormalizedUser(id) }
                            }))
                        }
                    ]
                }
            ]
        });
        for (const id of jids) {
            try {
                const normalizedId = jidNormalizedUser(id);
                const isPrivate = isPnUser(normalizedId);
                const type = isPrivate ? 'statusMentionMessage' : 'groupStatusMentionMessage';
                const protocolMessage = {
                    [type]: {
                        message: {
                            protocolMessage: {
                                key: msg.key,
                                type: 25
                            }
                        }
                    },
                    messageContextInfo: {
                        messageSecret: crypto.randomBytes(32)
                    }
                };
                const statusMsg = await generateWAMessageFromContent(normalizedId, protocolMessage, {
                    userJid: jidNormalizedUser(this.sock.authState?.creds?.me?.id || '')
                });
                await this.relayMessage(normalizedId, statusMsg.message, {
                    additionalNodes: [
                        {
                            tag: 'meta',
                            attrs: isPrivate ? { is_status_mention: 'true' } : { is_group_status_mention: 'true' }
                        }
                    ]
                });
                await delay(2000);
            }
            catch (error) {
                this.config.logger.error(`Error sending to ${id}: ${error}`);
            }
        }
        return msg;
    }
}
