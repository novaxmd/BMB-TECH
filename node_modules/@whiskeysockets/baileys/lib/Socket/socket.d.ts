import { Boom } from '@hapi/boom';
import type { SocketConfig } from '../Types/index.js';
import { type BinaryNode } from '../WABinary/index.js';
import { BinaryInfo } from '../WAM/BinaryInfo.js';
import { USyncQuery } from '../WAUSync//index.js';
import { WebSocketClient } from './Client/index.js';
export declare const makeSocket: (config: SocketConfig) => {
    type: "md";
    ws: WebSocketClient;
    ev: import("../Types").BaileysEventEmitter & {
        process(handler: (events: Partial<import("../Types").BaileysEventMap>) => void | Promise<void>): () => void;
        buffer(): void;
        createBufferedFunction<A extends any[], T>(work: (...args: A) => Promise<T>): (...args: A) => Promise<T>;
        flush(): boolean;
        isBuffering(): boolean;
    };
    authState: {
        creds: import("../Types").AuthenticationCreds;
        keys: import("../Types").SignalKeyStoreWithTransaction;
    };
    signalRepository: import("../Types").SignalRepositoryWithLIDStore;
    readonly user: import("../Types").Contact | undefined;
    generateMessageTag: () => string;
    query: (node: BinaryNode, timeoutMs?: number) => Promise<any>;
    waitForMessage: <T>(msgId: string, timeoutMs?: number | undefined) => Promise<T | undefined>;
    waitForSocketOpen: () => Promise<void>;
    sendRawMessage: (data: Uint8Array | Buffer) => Promise<void>;
    sendNode: (frame: BinaryNode) => Promise<void>;
    logout: (msg?: string) => Promise<void>;
    end: (error: Error | undefined) => Promise<void>;
    onUnexpectedError: (err: Error | Boom, msg: string) => void;
    uploadPreKeys: (count?: number, retryCount?: number) => Promise<void>;
    uploadPreKeysToServerIfRequired: () => Promise<void>;
    digestKeyBundle: () => Promise<void>;
    rotateSignedPreKey: () => Promise<void>;
    requestPairingCode: (phoneNumber: string, customPairingCode?: string) => Promise<string>;
    updateServerTimeOffset: ({ attrs }: BinaryNode) => void;
    sendUnifiedSession: () => Promise<void>;
    wamBuffer: BinaryInfo;
    waitForConnectionUpdate: (check: (u: Partial<import("../Types").ConnectionState>) => Promise<boolean | undefined>, timeoutMs?: number) => Promise<void>;
    sendWAMBuffer: (wamBuffer: Buffer) => Promise<any>;
    executeUSyncQuery: (usyncQuery: USyncQuery) => Promise<import("../index.js").USyncQueryResult | undefined>;
    onWhatsApp: (...phoneNumber: string[]) => Promise<{
        jid: string;
    registerSocketEndHandler: (handler: (error: Error | undefined) => void | Promise<void>) => void;
    fetchAccountReachoutTimelock: () => Promise<import("../Types").ReachoutTimelockState>;
    fetchNewChatMessageCap: () => Promise<import("../Types").NewChatMessageCapInfo | undefined>;
        exists: boolean;
    }[] | undefined>;
};
//# sourceMappingURL=socket.d.ts.map