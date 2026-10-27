import type { Agent } from 'https';
import type { URL } from 'url';
import { proto } from '../../WAProto/index.js';
import type { ILogger } from '../Utils/logger.js';
import type { AuthenticationState, LIDMapping, SignalAuthState, TransactionCapabilityOptions } from './Auth.js';
import type { GroupMetadata } from './GroupMetadata.js';
import { type MediaConnInfo, type WAMessageKey } from './Message.js';
import type { SignalRepositoryWithLIDStore } from './Signal.js';
export type WAVersion = [number, number, number];
export type WABrowserDescription = [string, string, string];
export type CacheStore = {
    get<T>(key: string): Promise<T> | T | undefined;
    set<T>(key: string, value: T): Promise<void> | void | number | boolean;
    del(key: string): void | Promise<void> | number | boolean;
    flushAll(): void | Promise<void>;
};
export type PossiblyExtendedCacheStore = CacheStore & {
    mget?: <T>(keys: string[]) => Promise<Record<string, T | undefined>>;
    mset?: <T>(entries: {
        key: string;
        value: T;
    }[]) => Promise<void> | void | number | boolean;
    mdel?: (keys: string[]) => void | Promise<void> | number | boolean;
};
export type PatchedMessageWithRecipientJID = proto.IMessage & {
    recipientJid?: string;
};
export type SocketConfig = {
    waWebSocketUrl: string | URL;
    connectTimeoutMs: number;
    defaultQueryTimeoutMs: number | undefined;
    keepAliveIntervalMs: number;
    mobile?: boolean;
    agent?: Agent;
    logger: ILogger;
    version: WAVersion;
    browser: WABrowserDescription;
    fetchAgent?: Agent;
    printQRInTerminal?: boolean;
    emitOwnEvents: boolean;
    customUploadHosts: MediaConnInfo['hosts'];
    retryRequestDelayMs: number;
    maxMsgRetryCount: number;
    qrTimeout?: number;
    auth: AuthenticationState;
    shouldSyncHistoryMessage: (msg: proto.Message.IHistorySyncNotification) => boolean;
    transactionOpts: TransactionCapabilityOptions;
    markOnlineOnConnect: boolean;
    countryCode: string;
    mediaCache?: CacheStore;
    msgRetryCounterCache?: CacheStore;
    userDevicesCache?: PossiblyExtendedCacheStore;
    callOfferCache?: CacheStore;
    placeholderResendCache?: CacheStore;
    linkPreviewImageThumbnailWidth: number;
    syncFullHistory: boolean;
    fireInitQueries: boolean;
    generateHighQualityLinkPreview: boolean;
    enableAutoSessionRecreation: boolean;
    enableRecentMessageCache: boolean;
    shouldIgnoreJid: (jid: string) => boolean | undefined;
    patchMessageBeforeSending: (msg: proto.IMessage, recipientJids?: string[]) => Promise<PatchedMessageWithRecipientJID[] | PatchedMessageWithRecipientJID> | PatchedMessageWithRecipientJID[] | PatchedMessageWithRecipientJID;
    appStateMacVerification: {
        patch: boolean;
        snapshot: boolean;
    };
    options: RequestInit;
    getMessage: (key: WAMessageKey) => Promise<proto.IMessage | undefined>;
    cachedGroupMetadata: (jid: string) => Promise<GroupMetadata | undefined>;
    makeSignalRepository: (auth: SignalAuthState, logger: ILogger, pnToLIDFunc?: (jids: string[]) => Promise<LIDMapping[] | undefined>) => SignalRepositoryWithLIDStore;
};
//# sourceMappingURL=Socket.d.ts.map