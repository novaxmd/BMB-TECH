import type { SignalKeyStoreWithTransaction } from '../Types/index.js';
import type { BinaryNode } from '../WABinary/index.js';
export declare const TC_TOKEN_INDEX_KEY = "__index";
export declare function readTcTokenIndex(keys: SignalKeyStoreWithTransaction): Promise<string[]>;
export declare function buildMergedTcTokenIndexWrite(keys: SignalKeyStoreWithTransaction, addedJids: Iterable<string>): Promise<{
    [TC_TOKEN_INDEX_KEY]: {
        token: Buffer;
    };
}>;
export declare function isTcTokenExpired(timestamp: number | string | null | undefined): boolean;
export declare function shouldSendNewTcToken(senderTimestamp: number | undefined): boolean;
export declare function resolveTcTokenJid(jid: string, getLIDForPN: (pn: string) => Promise<string | null>): Promise<string>;
export declare function resolveIssuanceJid(jid: string, issueToLid: boolean, getLIDForPN: (pn: string) => Promise<string | null>, getPNForLID?: (lid: string) => Promise<string | null>): Promise<string>;
type TcTokenParams = {
    jid: string;
    baseContent?: BinaryNode[];
    authState: {
        keys: SignalKeyStoreWithTransaction;
    };
    getLIDForPN: (pn: string) => Promise<string | null>;
};
export declare function buildTcTokenFromJid({ authState, jid, baseContent, getLIDForPN }: TcTokenParams): Promise<BinaryNode[] | undefined>;
type StoreTcTokensParams = {
    result: BinaryNode;
    fallbackJid: string;
    keys: SignalKeyStoreWithTransaction;
    getLIDForPN: (pn: string) => Promise<string | null>;
    onNewJidStored?: (jid: string) => void;
};
export declare function storeTcTokensFromIqResult({ result, fallbackJid, keys, getLIDForPN, onNewJidStored }: StoreTcTokensParams): Promise<void>;
export {};
//# sourceMappingURL=tc-token-utils.d.ts.map