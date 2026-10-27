import type { LIDMapping, SignalKeyStoreWithTransaction } from '../Types/index.js';
import type { ILogger } from '../Utils/logger.js';
export declare class LIDMappingStore {
    private readonly mappingCache;
    private readonly keys;
    private readonly logger;
    private pnToLIDFunc?;
    private readonly inflightLIDLookups;
    private readonly inflightPNLookups;
    constructor(keys: SignalKeyStoreWithTransaction, logger: ILogger, pnToLIDFunc?: (jids: string[]) => Promise<LIDMapping[] | undefined>);
    storeLIDPNMappings(pairs: LIDMapping[]): Promise<void>;
    getLIDForPN(pn: string): Promise<string | null>;
    getLIDsForPNs(pns: string[]): Promise<LIDMapping[] | null>;
    getPNsForLIDs(lids: string[]): Promise<LIDMapping[] | null>;
    getPNForLID(lid: string): Promise<string | null>;
}
//# sourceMappingURL=lid-mapping.d.ts.map