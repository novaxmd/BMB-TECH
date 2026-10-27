import type { proto } from '../../WAProto/index.js';
import type { ILogger } from './logger.js';
export interface RecentMessageKey {
    to: string;
    id: string;
}
export interface RecentMessage {
    message: proto.IMessage;
    timestamp: number;
}
export interface SessionRecreateHistory {
    [jid: string]: number;
}
export interface RetryCounter {
    [messageId: string]: number;
}
export type PendingPhoneRequest = Record<string, ReturnType<typeof setTimeout>>;
export interface RetryStatistics {
    totalRetries: number;
    successfulRetries: number;
    failedRetries: number;
    mediaRetries: number;
    sessionRecreations: number;
    phoneRequests: number;
}
export declare enum RetryReason {
    UnknownError = 0,
    SignalErrorNoSession = 1,
    SignalErrorInvalidKey = 2,
    SignalErrorInvalidKeyId = 3,
    SignalErrorInvalidMessage = 4,
    SignalErrorInvalidSignature = 5,
    SignalErrorFutureMessage = 6,
    SignalErrorBadMac = 7,
    SignalErrorInvalidSession = 8,
    SignalErrorInvalidMsgKey = 9,
    BadBroadcastEphemeralSetting = 10,
    UnknownCompanionNoPrekey = 11,
    AdvFailure = 12,
    StatusRevokeDelay = 13
}
export declare class MessageRetryManager {
    private logger;
    private recentMessagesMap;
    private messageKeyIndex;
    private sessionRecreateHistory;
    private retryCounters;
    private pendingPhoneRequests;
    private readonly maxMsgRetryCount;
    private statistics;
    constructor(logger: ILogger, maxMsgRetryCount: number);
    addRecentMessage(to: string, id: string, message: proto.IMessage): void;
    getRecentMessage(to: string, id: string): RecentMessage | undefined;
    shouldRecreateSession(jid: string, hasSession: boolean, errorCode?: RetryReason): {
        reason: string;
        recreate: boolean;
    };
    parseRetryErrorCode(errorAttr: string | undefined): RetryReason | undefined;
    isMacError(errorCode: RetryReason | undefined): boolean;
    incrementRetryCount(messageId: string): number;
    getRetryCount(messageId: string): number;
    hasExceededMaxRetries(messageId: string): boolean;
    markRetrySuccess(messageId: string): void;
    markRetryFailed(messageId: string): void;
    schedulePhoneRequest(messageId: string, callback: () => void, delay?: number): void;
    cancelPendingPhoneRequest(messageId: string): void;
    private keyToString;
    private removeRecentMessage;
}
//# sourceMappingURL=message-retry-manager.d.ts.map