import type { SignalDataSet, SignalDataTypeMap, SignalKeyStore } from '../Types/index.js';
import type { ILogger } from './logger.js';
export declare class PreKeyManager {
    private readonly store;
    private readonly logger;
    private readonly queues;
    constructor(store: SignalKeyStore, logger: ILogger);
    private getQueue;
    processOperations(data: SignalDataSet, keyType: keyof SignalDataTypeMap, transactionCache: SignalDataSet, mutations: SignalDataSet, isInTransaction: boolean): Promise<void>;
    private processDeletions;
    validateDeletions(data: SignalDataSet, keyType: keyof SignalDataTypeMap): Promise<void>;
}
//# sourceMappingURL=pre-key-manager.d.ts.map