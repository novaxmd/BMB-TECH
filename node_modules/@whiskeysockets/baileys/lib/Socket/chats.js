import NodeCache from '@cacheable/node-cache';
import { Boom } from '@hapi/boom';
import { proto } from '../../WAProto/index.js';
import { DEFAULT_CACHE_TTLS, HISTORY_SYNC_PAUSED_TIMEOUT_MS, PROCESSABLE_HISTORY_TYPES } from '../Defaults/index.js';
import { ALL_WA_PATCH_NAMES } from '../Types/index.js';
import { SyncState } from '../Types/State.js';
import { chatModificationToAppPatch, decodePatches, decodeSyncdSnapshot, encodeSyncdPatch, ensureLTHashStateVersion, extractSyncdPatches, generateProfilePicture, getHistoryMsg, isAppStateSyncIrrecoverable, isMissingKeyError, MAX_SYNC_ATTEMPTS, newLTHashState, processSyncAction } from '../Utils/index.js';
import { makeMutex } from '../Utils/make-mutex.js';
import processMessage from '../Utils/process-message.js';
import { buildTcTokenFromJid } from '../Utils/tc-token-utils.js';
import { getBinaryNodeChild, getBinaryNodeChildren, isLidUser, isPnUser, jidDecode, jidNormalizedUser, isHostedLidUser, isHostedPnUser, reduceBinaryNodeToDictionary, S_WHATSAPP_NET } from '../WABinary/index.js';
import { USyncQuery, USyncUser } from '../WAUSync/index.js';
import { makeSocket } from './socket.js';
export const makeChatsSocket = (config) => {
    const { logger, markOnlineOnConnect, fireInitQueries, appStateMacVerification, shouldIgnoreJid, shouldSyncHistoryMessage, getMessage } = config;
    const sock = makeSocket(config);
    const { ev, ws, authState, generateMessageTag, sendNode, query, signalRepository, onUnexpectedError, sendUnifiedSession } = sock;
    const getLIDForPN = signalRepository.lidMapping.getLIDForPN.bind(signalRepository.lidMapping);
    let privacySettings;
    const serverProps = {
        privacyTokenOn1to1: true,
        profilePicPrivacyToken: true,
        lidTrustedTokenIssueToLid: false
    };
    let syncState = SyncState.Connecting;
    const messageMutex = makeMutex();
    const receiptMutex = makeMutex();
    const appStatePatchMutex = makeMutex();
    const notificationMutex = makeMutex();
    let awaitingSyncTimeout;
    const historySyncStatus = {
        initialBootstrapComplete: false,
        recentSyncComplete: false
    };
    let historySyncPausedTimeout;
    const blockedCollections = new Set();
    const placeholderResendCache = config.placeholderResendCache ||
        new NodeCache({
            stdTTL: DEFAULT_CACHE_TTLS.MSG_RETRY,
            useClones: false
        });
    if (!config.placeholderResendCache) {
        config.placeholderResendCache = placeholderResendCache;
    }
    const getAppStateSyncKey = async (keyId) => {
        const { [keyId]: key } = await authState.keys.get('app-state-sync-key', [keyId]);
        return key;
    };
    const fetchPrivacySettings = async (force = false) => {
        if (!privacySettings || force) {
            const { content } = await query({
                tag: 'iq',
                attrs: {
                    xmlns: 'privacy',
                    to: S_WHATSAPP_NET,
                    type: 'get'
                },
                content: [{ tag: 'privacy', attrs: {} }]
            });
            privacySettings = reduceBinaryNodeToDictionary(content?.[0], 'category');
        }
        return privacySettings;
    };
    const privacyQuery = async (name, value) => {
        await query({
            tag: 'iq',
            attrs: {
                xmlns: 'privacy',
                to: S_WHATSAPP_NET,
                type: 'set'
            },
            content: [
                {
                    tag: 'privacy',
                    attrs: {},
                    content: [
                        {
                            tag: 'category',
                            attrs: { name, value }
                        }
                    ]
                }
            ]
        });
    };
    const updateMessagesPrivacy = async (value) => {
        await privacyQuery('messages', value);
    };
    const updateCallPrivacy = async (value) => {
        await privacyQuery('calladd', value);
    };
    const updateLastSeenPrivacy = async (value) => {
        await privacyQuery('last', value);
    };
    const updateOnlinePrivacy = async (value) => {
        await privacyQuery('online', value);
    };
    const updateProfilePicturePrivacy = async (value) => {
        await privacyQuery('profile', value);
    };
    const updateStatusPrivacy = async (value) => {
        await privacyQuery('status', value);
    };
    const updateReadReceiptsPrivacy = async (value) => {
        await privacyQuery('readreceipts', value);
    };
    const updateGroupsAddPrivacy = async (value) => {
        await privacyQuery('groupadd', value);
    };
    const updateDefaultDisappearingMode = async (duration) => {
        await query({
            tag: 'iq',
            attrs: {
                xmlns: 'disappearing_mode',
                to: S_WHATSAPP_NET,
                type: 'set'
            },
            content: [
                {
                    tag: 'disappearing_mode',
                    attrs: {
                        duration: duration.toString()
                    }
                }
            ]
        });
    };
    const getBotListV2 = async () => {
        const resp = await query({
            tag: 'iq',
            attrs: {
                xmlns: 'bot',
                to: S_WHATSAPP_NET,
                type: 'get'
            },
            content: [
                {
                    tag: 'bot',
                    attrs: {
                        v: '2'
                    }
                }
            ]
        });
        const botNode = getBinaryNodeChild(resp, 'bot');
        const botList = [];
        for (const section of getBinaryNodeChildren(botNode, 'section')) {
            if (section.attrs.type === 'all') {
                for (const bot of getBinaryNodeChildren(section, 'bot')) {
                    botList.push({
                        jid: bot.attrs.jid,
                        personaId: bot.attrs['persona_id']
                    });
                }
            }
        }
        return botList;
    };
    const fetchStatus = async (...jids) => {
        const usyncQuery = new USyncQuery().withStatusProtocol();
        for (const jid of jids) {
            usyncQuery.withUser(new USyncUser().withId(jid));
        }
        const result = await sock.executeUSyncQuery(usyncQuery);
        if (result) {
            return result.list;
        }
    };
    const fetchDisappearingDuration = async (...jids) => {
        const usyncQuery = new USyncQuery().withDisappearingModeProtocol();
        for (const jid of jids) {
            usyncQuery.withUser(new USyncUser().withId(jid));
        }
        const result = await sock.executeUSyncQuery(usyncQuery);
        if (result) {
            return result.list;
        }
    };
    const updateProfilePicture = async (jid, content, dimensions) => {
        let targetJid;
        if (!jid) {
            throw new Boom('Illegal no-jid profile update. Please specify either your ID or the ID of the chat you wish to update');
        }
        if (jidNormalizedUser(jid) !== jidNormalizedUser(authState.creds.me.id)) {
            targetJid = jidNormalizedUser(jid);
        }
        else {
            targetJid = undefined;
        }
        const { img } = await generateProfilePicture(content, dimensions);
        await query({
            tag: 'iq',
            attrs: {
                to: S_WHATSAPP_NET,
                type: 'set',
                xmlns: 'w:profile:picture',
                ...(targetJid ? { target: targetJid } : {})
            },
            content: [
                {
                    tag: 'picture',
                    attrs: { type: 'image' },
                    content: img
                }
            ]
        });
    };
    const removeProfilePicture = async (jid) => {
        let targetJid;
        if (!jid) {
            throw new Boom('Illegal no-jid profile update. Please specify either your ID or the ID of the chat you wish to update');
        }
        if (jidNormalizedUser(jid) !== jidNormalizedUser(authState.creds.me.id)) {
            targetJid = jidNormalizedUser(jid);
        }
        else {
            targetJid = undefined;
        }
        await query({
            tag: 'iq',
            attrs: {
                to: S_WHATSAPP_NET,
                type: 'set',
                xmlns: 'w:profile:picture',
                ...(targetJid ? { target: targetJid } : {})
            }
        });
    };
    const updateProfileStatus = async (status) => {
        await query({
            tag: 'iq',
            attrs: {
                to: S_WHATSAPP_NET,
                type: 'set',
                xmlns: 'status'
            },
            content: [
                {
                    tag: 'status',
                    attrs: {},
                    content: Buffer.from(status, 'utf-8')
                }
            ]
        });
    };
    const updateProfileName = async (name) => {
        await chatModify({ pushNameSetting: name }, '');
    };
    const fetchBlocklist = async () => {
        const result = await query({
            tag: 'iq',
            attrs: {
                xmlns: 'blocklist',
                to: S_WHATSAPP_NET,
                type: 'get'
            }
        });
        const listNode = getBinaryNodeChild(result, 'list');
        return getBinaryNodeChildren(listNode, 'item').map(n => n.attrs.jid);
    };
    const updateBlockStatus = async (jid, action) => {
        const normalizedJid = jidNormalizedUser(jid);
        let lid;
        let pn_jid;
        if (isLidUser(normalizedJid) || isHostedLidUser(normalizedJid)) {
            lid = normalizedJid;
            if (action === 'block') {
                const pn = await signalRepository.lidMapping.getPNForLID(normalizedJid);
                if (!pn) {
                    throw new Boom(`Unable to resolve PN JID for LID: ${jid}`, { statusCode: 400 });
                }
                pn_jid = jidNormalizedUser(pn);
            }
        }
        else if (isPnUser(normalizedJid) || isHostedPnUser(normalizedJid)) {
            const mapped = await signalRepository.lidMapping.getLIDForPN(normalizedJid);
            if (!mapped) {
                throw new Boom(`Unable to resolve LID for PN JID: ${jid}`, { statusCode: 400 });
            }
            lid = mapped;
            if (action === 'block') {
                pn_jid = jidNormalizedUser(normalizedJid);
            }
        }
        else {
            throw new Boom(`Invalid jid: ${jid}`, { statusCode: 400 });
        }
        const itemAttrs = {
            action,
            jid: lid
        };
        if (action === 'block') {
            if (!pn_jid) {
                throw new Boom(`pn_jid required for block: ${jid}`, { statusCode: 400 });
            }
            itemAttrs.pn_jid = pn_jid;
        }
        await query({
            tag: 'iq',
            attrs: {
                xmlns: 'blocklist',
                to: S_WHATSAPP_NET,
                type: 'set'
            },
            content: [
                {
                    tag: 'item',
                    attrs: itemAttrs
                }
            ]
        });
    };
    const getBusinessProfile = async (jid) => {
        const results = await query({
            tag: 'iq',
            attrs: {
                to: 's.whatsapp.net',
                xmlns: 'w:biz',
                type: 'get'
            },
            content: [
                {
                    tag: 'business_profile',
                    attrs: { v: '244' },
                    content: [
                        {
                            tag: 'profile',
                            attrs: { jid }
                        }
                    ]
                }
            ]
        });
        const profileNode = getBinaryNodeChild(results, 'business_profile');
        const profiles = getBinaryNodeChild(profileNode, 'profile');
        if (profiles) {
            const address = getBinaryNodeChild(profiles, 'address');
            const description = getBinaryNodeChild(profiles, 'description');
            const website = getBinaryNodeChild(profiles, 'website');
            const email = getBinaryNodeChild(profiles, 'email');
            const category = getBinaryNodeChild(getBinaryNodeChild(profiles, 'categories'), 'category');
            const businessHours = getBinaryNodeChild(profiles, 'business_hours');
            const businessHoursConfig = businessHours
                ? getBinaryNodeChildren(businessHours, 'business_hours_config')
                : undefined;
            const websiteStr = website?.content?.toString();
            return {
                wid: profiles.attrs?.jid,
                address: address?.content?.toString(),
                description: description?.content?.toString() || '',
                website: websiteStr ? [websiteStr] : [],
                email: email?.content?.toString(),
                category: category?.content?.toString(),
                business_hours: {
                    timezone: businessHours?.attrs?.timezone,
                    business_config: businessHoursConfig?.map(({ attrs }) => attrs)
                }
            };
        }
    };
    const cleanDirtyBits = async (type, fromTimestamp) => {
        logger.info({ fromTimestamp }, 'clean dirty bits ' + type);
        await sendNode({
            tag: 'iq',
            attrs: {
                to: S_WHATSAPP_NET,
                type: 'set',
                xmlns: 'urn:xmpp:whatsapp:dirty',
                id: generateMessageTag()
            },
            content: [
                {
                    tag: 'clean',
                    attrs: {
                        type,
                        ...(fromTimestamp ? { timestamp: fromTimestamp.toString() } : null)
                    }
                }
            ]
        });
    };
    const newAppStateChunkHandler = (isInitialSync) => {
        return {
            onMutation(mutation) {
                processSyncAction(mutation, ev, authState.creds.me, isInitialSync ? { accountSettings: authState.creds.accountSettings } : undefined, logger);
            }
        };
    };
    const resyncAppState = ev.createBufferedFunction(async (collections, isInitialSync) => {
        const appStateSyncKeyCache = new Map();
        const getCachedAppStateSyncKey = async (keyId) => {
            if (appStateSyncKeyCache.has(keyId)) {
                return appStateSyncKeyCache.get(keyId) ?? undefined;
            }
            const key = await getAppStateSyncKey(keyId);
            appStateSyncKeyCache.set(keyId, key ?? null);
            return key;
        };
        const initialVersionMap = {};
        const globalMutationMap = {};
        await authState.keys.transaction(async () => {
            const collectionsToHandle = new Set(collections);
            const attemptsMap = {};
            const forceSnapshotCollections = new Set();
            while (collectionsToHandle.size) {
                const states = {};
                const nodes = [];
                for (const name of collectionsToHandle) {
                    const result = await authState.keys.get('app-state-sync-version', [name]);
                    let state = result[name];
                    if (state) {
                        state = ensureLTHashStateVersion(state);
                        if (typeof initialVersionMap[name] === 'undefined') {
                            initialVersionMap[name] = state.version;
                        }
                    }
                    else {
                        state = newLTHashState();
                    }
                    states[name] = state;
                    const shouldForceSnapshot = forceSnapshotCollections.has(name);
                    if (shouldForceSnapshot) {
                        forceSnapshotCollections.delete(name);
                    }
                    logger.info(`resyncing ${name} from v${state.version}${shouldForceSnapshot ? ' (forcing snapshot)' : ''}`);
                    nodes.push({
                        tag: 'collection',
                        attrs: {
                            name,
                            version: state.version.toString(),
                            return_snapshot: (shouldForceSnapshot || !state.version).toString()
                        }
                    });
                }
                const result = await query({
                    tag: 'iq',
                    attrs: {
                        to: S_WHATSAPP_NET,
                        xmlns: 'w:sync:app:state',
                        type: 'set'
                    },
                    content: [
                        {
                            tag: 'sync',
                            attrs: {},
                            content: nodes
                        }
                    ]
                });
                const decoded = await extractSyncdPatches(result, config?.options);
                for (const key in decoded) {
                    const name = key;
                    const { patches, hasMorePatches, snapshot } = decoded[name];
                    try {
                        if (snapshot) {
                            const { state: newState, mutationMap } = await decodeSyncdSnapshot(name, snapshot, getCachedAppStateSyncKey, initialVersionMap[name], appStateMacVerification.snapshot);
                            states[name] = newState;
                            Object.assign(globalMutationMap, mutationMap);
                            logger.info(`restored state of ${name} from snapshot to v${newState.version} with mutations`);
                            await authState.keys.set({ 'app-state-sync-version': { [name]: newState } });
                        }
                        if (patches.length) {
                            const { state: newState, mutationMap } = await decodePatches(name, patches, states[name], getCachedAppStateSyncKey, config.options, initialVersionMap[name], logger, appStateMacVerification.patch);
                            await authState.keys.set({ 'app-state-sync-version': { [name]: newState } });
                            logger.info(`synced ${name} to v${newState.version}`);
                            initialVersionMap[name] = newState.version;
                            Object.assign(globalMutationMap, mutationMap);
                        }
                        if (hasMorePatches) {
                            logger.info(`${name} has more patches...`);
                        }
                        else {
                            collectionsToHandle.delete(name);
                        }
                    }
                    catch (error) {
                        attemptsMap[name] = (attemptsMap[name] || 0) + 1;
                        const logData = {
                            name,
                            attempt: attemptsMap[name],
                            version: states[name].version,
                            statusCode: error.output?.statusCode,
                            errorType: error.name,
                            error: error.stack
                        };
                        if (isMissingKeyError(error) && attemptsMap[name] >= MAX_SYNC_ATTEMPTS) {
                            logger.warn(logData, `${name} blocked on missing key from v${states[name].version}, parking after ${attemptsMap[name]} attempts`);
                            blockedCollections.add(name);
                            collectionsToHandle.delete(name);
                        }
                        else if (isMissingKeyError(error)) {
                            logger.info(logData, `${name} blocked on missing key from v${states[name].version}, retrying with snapshot`);
                            forceSnapshotCollections.add(name);
                        }
                        else if (isAppStateSyncIrrecoverable(error, attemptsMap[name])) {
                            logger.warn(logData, `failed to sync ${name} from v${states[name].version}, giving up`);
                            collectionsToHandle.delete(name);
                        }
                        else {
                            logger.info(logData, `failed to sync ${name} from v${states[name].version}, forcing snapshot retry`);
                            forceSnapshotCollections.add(name);
                        }
                    }
                }
            }
        }, authState?.creds?.me?.id || 'resync-app-state');
        const { onMutation } = newAppStateChunkHandler(isInitialSync);
        for (const key in globalMutationMap) {
            onMutation(globalMutationMap[key]);
        }
    });
    const profilePictureUrl = async (jid, type = 'preview', timeoutMs) => {
        const baseContent = [{ tag: 'picture', attrs: { type, query: 'url' } }];
        const normalizedJid = jidNormalizedUser(jid);
        const isUserJid = isPnUser(normalizedJid) || isLidUser(normalizedJid);
        const me = authState.creds.me;
        const isSelf = me && (normalizedJid === jidNormalizedUser(me.id) || (me.lid && normalizedJid === jidNormalizedUser(me.lid)));
        let content = baseContent;
        if (serverProps.profilePicPrivacyToken && isUserJid && !isSelf) {
            content = await buildTcTokenFromJid({
                authState,
                jid: normalizedJid,
                baseContent,
                getLIDForPN
            });
        }
        jid = jidNormalizedUser(jid);
        const result = await query({
            tag: 'iq',
            attrs: {
                target: jid,
                to: S_WHATSAPP_NET,
                type: 'get',
                xmlns: 'w:profile:picture'
            },
            content
        }, timeoutMs);
        const child = getBinaryNodeChild(result, 'picture');
        return child?.attrs?.url;
    };
    const createCallLink = async (type, event, timeoutMs) => {
        const result = await query({
            tag: 'call',
            attrs: {
                id: generateMessageTag(),
                to: '@call'
            },
            content: [
                {
                    tag: 'link_create',
                    attrs: { media: type },
                    content: event ? [{ tag: 'event', attrs: { start_time: String(event.startTime) } }] : undefined
                }
            ]
        }, timeoutMs);
        const child = getBinaryNodeChild(result, 'link_create');
        return child?.attrs?.token;
    };
    const sendPresenceUpdate = async (type, toJid) => {
        const me = authState.creds.me;
        const isAvailableType = type === 'available';
        if (isAvailableType || type === 'unavailable') {
            if (!me.name) {
                logger.warn('no name present, ignoring presence update request...');
                return;
            }
            ev.emit('connection.update', { isOnline: isAvailableType });
            if (isAvailableType) {
                void sendUnifiedSession();
            }
            await sendNode({
                tag: 'presence',
                attrs: {
                    name: me.name.replace(/@/g, ''),
                    type
                }
            });
        }
        else {
            const { server } = jidDecode(toJid);
            const isLid = server === 'lid';
            await sendNode({
                tag: 'chatstate',
                attrs: {
                    from: isLid ? me.lid : me.id,
                    to: toJid
                },
                content: [
                    {
                        tag: type === 'recording' ? 'composing' : type,
                        attrs: type === 'recording' ? { media: 'audio' } : {}
                    }
                ]
            });
        }
    };
    const presenceSubscribe = async (toJid) => {
        const normalizedToJid = jidNormalizedUser(toJid);
        const isUserJid = isPnUser(normalizedToJid) || isLidUser(normalizedToJid);
        const tcTokenContent = isUserJid
            ? await buildTcTokenFromJid({ authState, jid: normalizedToJid, getLIDForPN })
            : undefined;
        return sendNode({
            tag: 'presence',
            attrs: {
                to: toJid,
                id: generateMessageTag(),
                type: 'subscribe'
            },
            content: tcTokenContent
        });
    };
    const handlePresenceUpdate = ({ tag, attrs, content }) => {
        let presence;
        const jid = attrs.from;
        const participant = attrs.participant || attrs.from;
        if (shouldIgnoreJid(jid) && jid !== S_WHATSAPP_NET) {
            return;
        }
        if (tag === 'presence') {
            presence = {
                lastKnownPresence: attrs.type === 'unavailable' ? 'unavailable' : 'available',
                lastSeen: attrs.last && attrs.last !== 'deny' ? +attrs.last : undefined
            };
        }
        else if (Array.isArray(content)) {
            const [firstChild] = content;
            let type = firstChild.tag;
            if (type === 'paused') {
                type = 'available';
            }
            if (firstChild.attrs?.media === 'audio') {
                type = 'recording';
            }
            presence = { lastKnownPresence: type };
        }
        else {
            logger.error({ tag, attrs, content }, 'recv invalid presence node');
        }
        if (presence) {
            ev.emit('presence.update', { id: jid, presences: { [participant]: presence } });
        }
    };
    const appPatch = async (patchCreate) => {
        const name = patchCreate.type;
        const myAppStateKeyId = authState.creds.myAppStateKeyId;
        if (!myAppStateKeyId) {
            throw new Boom('App state key not present!', { statusCode: 400 });
        }
        let initial;
        let encodeResult;
        await appStatePatchMutex.mutex(async () => {
            await authState.keys.transaction(async () => {
                logger.debug({ patch: patchCreate }, 'applying app patch');
                await resyncAppState([name], false);
                const { [name]: currentSyncVersion } = await authState.keys.get('app-state-sync-version', [name]);
                initial = currentSyncVersion ? ensureLTHashStateVersion(currentSyncVersion) : newLTHashState();
                try {
                    encodeResult = await encodeSyncdPatch(patchCreate, myAppStateKeyId, initial, getAppStateSyncKey);
                }
                catch (syncErr) {
                    if (typeof syncErr?.message === 'string' && syncErr.message.includes('not present')) {
                        logger.warn({ keyId: myAppStateKeyId }, 'app state key missing — resyncing');
                        await resyncAppState(ALL_WA_PATCH_NAMES, true);
                        const { [name]: freshVersion } = await authState.keys.get('app-state-sync-version', [name]);
                        initial = freshVersion ? ensureLTHashStateVersion(freshVersion) : newLTHashState();
                        encodeResult = await encodeSyncdPatch(patchCreate, myAppStateKeyId, initial, getAppStateSyncKey);
                    }
                    else {
                        throw syncErr;
                    }
                }
                const { patch, state } = encodeResult;
                const node = {
                    tag: 'iq',
                    attrs: {
                        to: S_WHATSAPP_NET,
                        type: 'set',
                        xmlns: 'w:sync:app:state'
                    },
                    content: [
                        {
                            tag: 'sync',
                            attrs: {},
                            content: [
                                {
                                    tag: 'collection',
                                    attrs: {
                                        name,
                                        version: (state.version - 1).toString(),
                                        return_snapshot: 'false'
                                    },
                                    content: [
                                        {
                                            tag: 'patch',
                                            attrs: {},
                                            content: proto.SyncdPatch.encode(patch).finish()
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                };
                await query(node);
                await authState.keys.set({ 'app-state-sync-version': { [name]: state } });
            }, authState?.creds?.me?.id || 'app-patch');
        });
        if (config.emitOwnEvents) {
            const { onMutation } = newAppStateChunkHandler(false);
            const { mutationMap } = await decodePatches(name, [{ ...encodeResult.patch, version: { version: encodeResult.state.version } }], initial, getAppStateSyncKey, config.options, undefined, logger);
            for (const key in mutationMap) {
                onMutation(mutationMap[key]);
            }
        }
    };
    const fetchProps = async () => {
        const resultNode = await query({
            tag: 'iq',
            attrs: {
                to: S_WHATSAPP_NET,
                xmlns: 'abt',
                type: 'get'
            },
            content: [
                {
                    tag: 'props',
                    attrs: {
                        protocol: '1',
                        ...(authState?.creds?.lastPropHash ? { hash: authState.creds.lastPropHash } : {})
                    }
                }
            ]
        });
        const propsNode = getBinaryNodeChild(resultNode, 'props');
        let props = {};
        if (propsNode) {
            if (propsNode.attrs?.hash) {
                authState.creds.lastPropHash = propsNode?.attrs?.hash;
                ev.emit('creds.update', authState.creds);
            }
            props = reduceBinaryNodeToDictionary(propsNode, 'prop');
        }
        const privacyTokenProp = props['10518'] ?? props['privacy_token_sending_on_all_1_on_1_messages'];
        if (privacyTokenProp !== undefined) {
            serverProps.privacyTokenOn1to1 = privacyTokenProp === 'true' || privacyTokenProp === '1';
        }
        const profilePicProp = props['9666'] ?? props['profile_scraping_privacy_token_in_photo_iq'];
        if (profilePicProp !== undefined) {
            serverProps.profilePicPrivacyToken = profilePicProp === 'true' || profilePicProp === '1';
        }
        const lidIssueProp = props['14303'] ?? props['lid_trusted_token_issue_to_lid'];
        if (lidIssueProp !== undefined) {
            serverProps.lidTrustedTokenIssueToLid = lidIssueProp === 'true' || lidIssueProp === '1';
        }
        logger.debug({ serverProps }, 'fetched props');
        return props;
    };
    const chatModify = (mod, jid) => {
        const patch = chatModificationToAppPatch(mod, jid);
        return appPatch(patch);
    };
    const updateDisableLinkPreviewsPrivacy = (isPreviewsDisabled) => {
        return chatModify({
            disableLinkPreviews: { isPreviewsDisabled }
        }, '');
    };
    const star = (jid, messages, star) => {
        return chatModify({
            star: {
                messages,
                star
            }
        }, jid);
    };
    const addOrEditContact = (jid, contact) => {
        return chatModify({
            contact
        }, jid);
    };
    const removeContact = (jid) => {
        return chatModify({
            contact: null
        }, jid);
    };
    const addLabel = (jid, labels) => {
        return chatModify({
            addLabel: {
                ...labels
            }
        }, jid);
    };
    const addChatLabel = (jid, labelId) => {
        return chatModify({
            addChatLabel: {
                labelId
            }
        }, jid);
    };
    const removeChatLabel = (jid, labelId) => {
        return chatModify({
            removeChatLabel: {
                labelId
            }
        }, jid);
    };
    const addMessageLabel = (jid, messageId, labelId) => {
        return chatModify({
            addMessageLabel: {
                messageId,
                labelId
            }
        }, jid);
    };
    const removeMessageLabel = (jid, messageId, labelId) => {
        return chatModify({
            removeMessageLabel: {
                messageId,
                labelId
            }
        }, jid);
    };
    const addOrEditQuickReply = (quickReply) => {
        return chatModify({
            quickReply
        }, '');
    };
    const removeQuickReply = (timestamp) => {
        return chatModify({
            quickReply: { timestamp, deleted: true }
        }, '');
    };
    const executeInitQueries = async () => {
        await Promise.all([fetchProps(), fetchBlocklist(), fetchPrivacySettings()]);
    };
    const upsertMessage = ev.createBufferedFunction(async (msg, type) => {
        ev.emit('messages.upsert', { messages: [msg], type });
        if (!!msg.pushName) {
            let jid = msg.key.fromMe ? authState.creds.me.id : msg.key.participant || msg.key.remoteJid;
            jid = jidNormalizedUser(jid);
            if (!msg.key.fromMe) {
                ev.emit('contacts.update', [{ id: jid, notify: msg.pushName, verifiedName: msg.verifiedBizName }]);
            }
            if (msg.key.fromMe && msg.pushName && authState.creds.me?.name !== msg.pushName) {
                ev.emit('creds.update', { me: { ...authState.creds.me, name: msg.pushName } });
            }
        }
        const historyMsg = getHistoryMsg(msg.message);
        const shouldProcessHistoryMsg = historyMsg
            ? shouldSyncHistoryMessage(historyMsg) &&
                PROCESSABLE_HISTORY_TYPES.includes(historyMsg.syncType)
            : false;
        if (historyMsg && shouldProcessHistoryMsg) {
            const syncType = historyMsg.syncType;
            if (syncType === proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP &&
                !historySyncStatus.initialBootstrapComplete) {
                historySyncStatus.initialBootstrapComplete = true;
                ev.emit('messaging-history.status', {
                    syncType,
                    status: 'complete',
                    explicit: true
                });
            }
            if (syncType === proto.HistorySync.HistorySyncType.RECENT &&
                historyMsg.progress === 100 &&
                !historySyncStatus.recentSyncComplete) {
                historySyncStatus.recentSyncComplete = true;
                clearTimeout(historySyncPausedTimeout);
                historySyncPausedTimeout = undefined;
                ev.emit('messaging-history.status', {
                    syncType,
                    status: 'complete',
                    explicit: true
                });
            }
            if (syncType === proto.HistorySync.HistorySyncType.RECENT && !historySyncStatus.recentSyncComplete) {
                clearTimeout(historySyncPausedTimeout);
                historySyncPausedTimeout = setTimeout(() => {
                    if (!historySyncStatus.recentSyncComplete) {
                        historySyncStatus.recentSyncComplete = true;
                        ev.emit('messaging-history.status', {
                            syncType: proto.HistorySync.HistorySyncType.RECENT,
                            status: 'paused',
                            explicit: false
                        });
                    }
                    historySyncPausedTimeout = undefined;
                }, HISTORY_SYNC_PAUSED_TIMEOUT_MS);
            }
        }
        if (historyMsg && syncState === SyncState.AwaitingInitialSync) {
            if (awaitingSyncTimeout) {
                clearTimeout(awaitingSyncTimeout);
                awaitingSyncTimeout = undefined;
            }
            if (shouldProcessHistoryMsg) {
                syncState = SyncState.Syncing;
                logger.info('Transitioned to Syncing state');
            }
            else {
                syncState = SyncState.Online;
                logger.info('History sync skipped, transitioning to Online state and flushing buffer');
                ev.flush();
            }
        }
        const doAppStateSync = async () => {
            if (syncState === SyncState.Syncing) {
                blockedCollections.clear();
                logger.info('Doing app state sync');
                await resyncAppState(ALL_WA_PATCH_NAMES, true);
                syncState = SyncState.Online;
                logger.info('App state sync complete, transitioning to Online state and flushing buffer');
                ev.flush();
                const accountSyncCounter = (authState.creds.accountSyncCounter || 0) + 1;
                ev.emit('creds.update', { accountSyncCounter });
            }
        };
        await Promise.all([
            (async () => {
                if (shouldProcessHistoryMsg) {
                    await doAppStateSync();
                }
            })(),
            processMessage(msg, {
                signalRepository,
                shouldProcessHistoryMsg,
                placeholderResendCache,
                ev,
                creds: authState.creds,
                keyStore: authState.keys,
                logger,
                options: config.options,
                getMessage
            })
        ]);
        if (msg.message?.protocolMessage?.appStateSyncKeyShare && syncState === SyncState.Syncing) {
            logger.info('App state sync key arrived, triggering app state sync');
            await doAppStateSync();
        }
    });
    ws.on('CB:presence', handlePresenceUpdate);
    ws.on('CB:chatstate', handlePresenceUpdate);
    ws.on('CB:ib,,dirty', async (node) => {
        const { attrs } = getBinaryNodeChild(node, 'dirty');
        const type = attrs.type;
        switch (type) {
            case 'account_sync':
                if (attrs.timestamp) {
                    let { lastAccountSyncTimestamp } = authState.creds;
                    if (lastAccountSyncTimestamp) {
                        await cleanDirtyBits('account_sync', lastAccountSyncTimestamp);
                    }
                    lastAccountSyncTimestamp = +attrs.timestamp;
                    ev.emit('creds.update', { lastAccountSyncTimestamp });
                }
                break;
            case 'groups':
                break;
            default:
                logger.info({ node }, 'received unknown sync');
                break;
        }
    });
    ev.on('connection.update', ({ connection, receivedPendingNotifications }) => {
        if (connection === 'close') {
            blockedCollections.clear();
            clearTimeout(historySyncPausedTimeout);
            historySyncPausedTimeout = undefined;
        }
        if (connection === 'open') {
            if (fireInitQueries) {
                executeInitQueries().catch(error => onUnexpectedError(error, 'init queries'));
            }
            sendPresenceUpdate(markOnlineOnConnect ? 'available' : 'unavailable').catch(error => onUnexpectedError(error, 'presence update requests'));
        }
        if (!receivedPendingNotifications || syncState !== SyncState.Connecting) {
            return;
        }
        historySyncStatus.initialBootstrapComplete = false;
        historySyncStatus.recentSyncComplete = false;
        clearTimeout(historySyncPausedTimeout);
        historySyncPausedTimeout = undefined;
        syncState = SyncState.AwaitingInitialSync;
        logger.info('Connection is now AwaitingInitialSync, buffering events');
        ev.buffer();
        const willSyncHistory = shouldSyncHistoryMessage(proto.Message.HistorySyncNotification.create({
            syncType: proto.HistorySync.HistorySyncType.RECENT
        }));
        if (!willSyncHistory) {
            logger.info('History sync is disabled by config, not waiting for notification. Transitioning to Online.');
            syncState = SyncState.Online;
            setTimeout(() => ev.flush(), 0);
            return;
        }
        if (authState.creds.accountSyncCounter > 0) {
            logger.info('Reconnection with existing sync data, skipping history sync wait. Transitioning to Online.');
            syncState = SyncState.Online;
            setTimeout(() => ev.flush(), 0);
            return;
        }
        logger.info('First connection, awaiting history sync notification with a 20s timeout.');
        if (awaitingSyncTimeout) {
            clearTimeout(awaitingSyncTimeout);
        }
        awaitingSyncTimeout = setTimeout(() => {
            if (syncState === SyncState.AwaitingInitialSync) {
                logger.warn('Timeout in AwaitingInitialSync, forcing state to Online and flushing buffer');
                syncState = SyncState.Online;
                ev.flush();
                const accountSyncCounter = (authState.creds.accountSyncCounter || 0) + 1;
                ev.emit('creds.update', { accountSyncCounter });
            }
        }, 20000);
    });
    ev.on('creds.update', ({ myAppStateKeyId }) => {
        if (!myAppStateKeyId || blockedCollections.size === 0) {
            return;
        }
        if (syncState === SyncState.Syncing) {
            blockedCollections.clear();
            return;
        }
        const collections = [...blockedCollections];
        blockedCollections.clear();
        logger.info({ collections }, 'app state sync key arrived, re-syncing blocked collections');
        resyncAppState(collections, false).catch(error => onUnexpectedError(error, 'blocked collections resync'));
    });
    ev.on('lid-mapping.update', async ({ lid, pn }) => {
        try {
            await signalRepository.lidMapping.storeLIDPNMappings([{ lid, pn }]);
        }
        catch (error) {
            logger.warn({ lid, pn, error }, 'Failed to store LID-PN mapping');
        }
    });
    return {
        ...sock,
        serverProps,
        createCallLink,
        getBotListV2,
        messageMutex,
        receiptMutex,
        appStatePatchMutex,
        notificationMutex,
        fetchPrivacySettings,
        upsertMessage,
        appPatch,
        sendPresenceUpdate,
        presenceSubscribe,
        profilePictureUrl,
        fetchBlocklist,
        fetchStatus,
        fetchDisappearingDuration,
        updateProfilePicture,
        removeProfilePicture,
        updateProfileStatus,
        updateProfileName,
        updateBlockStatus,
        updateDisableLinkPreviewsPrivacy,
        updateCallPrivacy,
        updateMessagesPrivacy,
        updateLastSeenPrivacy,
        updateOnlinePrivacy,
        updateProfilePicturePrivacy,
        updateStatusPrivacy,
        updateReadReceiptsPrivacy,
        updateGroupsAddPrivacy,
        updateDefaultDisappearingMode,
        getBusinessProfile,
        resyncAppState,
        chatModify,
        cleanDirtyBits,
        addOrEditContact,
        removeContact,
        addLabel,
        addChatLabel,
        removeChatLabel,
        addMessageLabel,
        removeMessageLabel,
        star,
        addOrEditQuickReply,
        removeQuickReply
    };
};
//# sourceMappingURL=chats.js.map