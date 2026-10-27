import { proto } from '../../WAProto/index.js';
import type { AuthenticationCreds, BaileysEventEmitter, CacheStore, SignalKeyStoreWithTransaction, SignalRepositoryWithLIDStore, SocketConfig, WAMessage, WAMessageKey } from '../Types/index.js';
import type { ILogger } from './logger.js';
type ProcessMessageContext = {
    shouldProcessHistoryMsg: boolean;
    placeholderResendCache?: CacheStore;
    creds: AuthenticationCreds;
    keyStore: SignalKeyStoreWithTransaction;
    ev: BaileysEventEmitter;
    logger?: ILogger;
    options: RequestInit;
    signalRepository: SignalRepositoryWithLIDStore;
    getMessage: SocketConfig['getMessage'];
};
export declare const cleanMessage: (message: WAMessage, meId: string, meLid: string) => void;
export declare const isRealMessage: (message: WAMessage) => boolean;
export declare const shouldIncrementChatUnread: (message: WAMessage) => boolean;
export declare const getChatId: ({ remoteJid, participant, fromMe }: WAMessageKey) => string;
type PollContext = {
    pollCreatorJid: string;
    pollMsgId: string;
    pollEncKey: Uint8Array;
    voterJid: string;
};
type EventContext = {
    eventCreatorJid: string;
    eventMsgId: string;
    eventEncKey: Uint8Array;
    responderJid: string;
};
export declare function decryptPollVote({ encPayload, encIv }: proto.Message.IPollEncValue, { pollCreatorJid, pollMsgId, pollEncKey, voterJid }: PollContext): proto.Message.PollVoteMessage;
export declare function decryptEventResponse({ encPayload, encIv }: proto.Message.IPollEncValue, { eventCreatorJid, eventMsgId, eventEncKey, responderJid }: EventContext): proto.Message.EventResponseMessage;
declare const processMessage: (message: WAMessage, { shouldProcessHistoryMsg, placeholderResendCache, ev, creds, signalRepository, keyStore, logger, options, getMessage }: ProcessMessageContext) => Promise<void>;
export default processMessage;
//# sourceMappingURL=process-message.d.ts.map