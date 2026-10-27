import { proto } from '../../WAProto/index.js';
import type { BaileysEventEmitter, BaileysEventMap, ConnectionState, WACallUpdateType, WAMessageKey, WAVersion } from '../Types/index.js';
import { type BinaryNode } from '../WABinary/index.js';
export declare const BufferJSON: {
    replacer: (k: any, value: any) => any;
    reviver: (_: any, value: any) => any;
};
export declare const getKeyAuthor: (key: WAMessageKey | undefined | null, meId?: string) => string;
export declare const isStringNullOrEmpty: (value: string | null | undefined) => value is null | undefined | "";
export declare const writeRandomPadMax16: (msg: Uint8Array) => any;
export declare const unpadRandomMax16: (e: Uint8Array | Buffer) => Uint8Array<any>;
export declare const generateParticipantHashV2: (participants: string[]) => string;
export declare const encodeWAMessage: (message: proto.IMessage) => any;
export declare const generateRegistrationId: () => number;
export declare const encodeBigEndian: (e: number, t?: number) => Uint8Array<ArrayBuffer>;
export declare const toNumber: (t: Long | number | null | undefined) => number;
export declare const unixTimestampSeconds: (date?: Date) => number;
export type DebouncedTimeout = ReturnType<typeof debouncedTimeout>;
export declare const debouncedTimeout: (intervalMs?: number, task?: () => void) => {
    start: (newIntervalMs?: number, newTask?: () => void) => void;
    cancel: () => void;
    setTask: (newTask: () => void) => () => void;
    setInterval: (newInterval: number) => number;
};
export declare const delay: (ms: number) => Promise<void>;
export declare const delayCancellable: (ms: number) => {
    delay: Promise<void>;
    cancel: () => void;
};
export declare function promiseTimeout<T>(ms: number | undefined, promise: (resolve: (v: T) => void, reject: (error: any) => void) => void): Promise<T>;
export declare const generateMessageIDV2: (userId?: string) => string;
export declare const generateMessageID: () => string;
export declare function bindWaitForEvent<T extends keyof BaileysEventMap>(ev: BaileysEventEmitter, event: T): (check: (u: BaileysEventMap[T]) => Promise<boolean | undefined>, timeoutMs?: number) => Promise<void>;
export declare const bindWaitForConnectionUpdate: (ev: BaileysEventEmitter) => (check: (u: Partial<ConnectionState>) => Promise<boolean | undefined>, timeoutMs?: number) => Promise<void>;
export declare const fetchLatestBaileysVersion: (options?: RequestInit) => Promise<{
    version: WAVersion;
    isLatest: boolean;
    error?: undefined;
} | {
    version: WAVersion;
    isLatest: boolean;
    error: unknown;
}>;
export declare const fetchLatestWaWebVersion: (options?: RequestInit) => Promise<{
    version: WAVersion;
    isLatest: boolean;
    error?: undefined;
} | {
    version: WAVersion;
    isLatest: boolean;
    error: unknown;
}>;
export declare const generateMdTagPrefix: () => string;
export declare const getStatusFromReceiptType: (type: string | undefined) => proto.WebMessageInfo.Status | undefined;
export declare const getErrorCodeFromStreamError: (node: BinaryNode) => {
    reason: string;
    statusCode: number;
};
export declare const getCallStatusFromNode: ({ tag, attrs }: BinaryNode) => WACallUpdateType;
export declare const getCodeFromWSError: (error: Error) => number;
export declare const isWABusinessPlatform: (platform: string) => platform is "smba" | "smbi";
export declare function trimUndefined(obj: {
    [_: string]: any;
}): {
    [_: string]: any;
};
export declare function bytesToCrockford(buffer: Buffer): string;
export declare function encodeNewsletterMessage(message: proto.IMessage): Uint8Array;
//# sourceMappingURL=generics.d.ts.map