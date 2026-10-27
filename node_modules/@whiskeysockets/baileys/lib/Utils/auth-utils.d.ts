import type { AuthenticationCreds, CacheStore, SignalKeyStore, SignalKeyStoreWithTransaction, TransactionCapabilityOptions } from '../Types/index.js';
import type { ILogger } from './logger.js';
export declare function makeCacheableSignalKeyStore(store: SignalKeyStore, logger?: ILogger, _cache?: CacheStore): SignalKeyStore;
export declare const addTransactionCapability: (state: SignalKeyStore, logger: ILogger, { maxCommitRetries, delayBetweenTriesMs }: TransactionCapabilityOptions) => SignalKeyStoreWithTransaction;
export declare const initAuthCreds: () => AuthenticationCreds;
//# sourceMappingURL=auth-utils.d.ts.map