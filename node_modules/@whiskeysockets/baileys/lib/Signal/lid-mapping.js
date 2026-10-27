import { LRUCache } from 'lru-cache';
import { isHostedPnUser, isLidUser, isPnUser, jidDecode, jidNormalizedUser, WAJIDDomains } from '../WABinary/index.js';
export class LIDMappingStore {
    constructor(keys, logger, pnToLIDFunc) {
        this.mappingCache = new LRUCache({
            ttl: 3 * 24 * 60 * 60 * 1000,
            ttlAutopurge: true,
            updateAgeOnGet: true
        });
        this.inflightLIDLookups = new Map();
        this.inflightPNLookups = new Map();
        this.keys = keys;
        this.logger = logger;
        this.pnToLIDFunc = pnToLIDFunc;
    }
    async storeLIDPNMappings(pairs) {
        const pairMap = {};
        for (const { lid, pn } of pairs) {
            if (!lid || !pn)
                continue;
            const lidDecoded = jidDecode(lid);
            const pnDecoded = jidDecode(pn);
            if (!lidDecoded || !pnDecoded)
                continue;
            const pnUser = pnDecoded.user;
            const lidUser = lidDecoded.user;
            if (!pnUser || !lidUser || typeof pnUser !== 'string' || typeof lidUser !== 'string')
                continue;
            const existingLidUser = this.mappingCache.get(`pn:${pnUser}`);
            if (existingLidUser === lidUser)
                continue;
            pairMap[pnUser] = lidUser;
        }
        if (Object.keys(pairMap).length === 0)
            return;
        try {
            await this.keys.transaction(async () => {
                for (const [pnUser, lidUser] of Object.entries(pairMap)) {
                    await this.keys.set({
                        'lid-mapping': {
                            [pnUser]: lidUser,
                            [`${lidUser}_reverse`]: pnUser
                        }
                    });
                    this.mappingCache.set(`pn:${pnUser}`, lidUser);
                    this.mappingCache.set(`lid:${lidUser}`, pnUser);
                }
            }, 'lid-mapping');
        }
        catch (e) {
            this.logger.warn({ e }, 'failed to store LID-PN mappings');
        }
    }
    async getLIDForPN(pn) {
        if (!pn)
            return null;
        if (this.inflightPNLookups.has(pn)) {
            return (await this.inflightPNLookups.get(pn))?.[0]?.lid || null;
        }
        const promise = this.getLIDsForPNs([pn]);
        this.inflightPNLookups.set(pn, promise);
        try {
            return (await promise)?.[0]?.lid || null;
        }
        finally {
            this.inflightPNLookups.delete(pn);
        }
    }
    async getLIDsForPNs(pns) {
        if (pns.length === 0)
            return null;
        const usyncFetch = {};
        const successfulPairs = {};
        for (const pn of pns) {
            if (!pn)
                continue;
            if (!isPnUser(pn) && !isHostedPnUser(pn))
                continue;
            const decoded = jidDecode(pn);
            if (!decoded?.user)
                continue;
            const pnUser = decoded.user;
            let lidUser = this.mappingCache.get(`pn:${pnUser}`);
            if (!lidUser) {
                try {
                    const stored = await this.keys.get('lid-mapping', [pnUser]);
                    lidUser = stored[pnUser];
                    if (lidUser) {
                        this.mappingCache.set(`pn:${pnUser}`, lidUser);
                        this.mappingCache.set(`lid:${lidUser}`, pnUser);
                    }
                    else {
                        const device = decoded.device || 0;
                        let normalizedPn = jidNormalizedUser(pn) || `${pnUser}@s.whatsapp.net`;
                        if (isHostedPnUser(normalizedPn)) {
                            normalizedPn = `${pnUser}@s.whatsapp.net`;
                        }
                        if (!usyncFetch[normalizedPn]) {
                            usyncFetch[normalizedPn] = [device];
                        }
                        else {
                            usyncFetch[normalizedPn].push(device);
                        }
                        continue;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            if (typeof lidUser !== 'string' || !lidUser)
                continue;
            const pnDevice = decoded.device !== undefined ? decoded.device : 0;
            const deviceSpecificLid = `${lidUser}${pnDevice ? `:${pnDevice}` : ''}@${decoded.server === 'hosted' ? 'hosted.lid' : 'lid'}`;
            successfulPairs[pn] = { lid: deviceSpecificLid, pn };
        }
        if (Object.keys(usyncFetch).length > 0) {
            try {
                const result = await this.pnToLIDFunc?.(Object.keys(usyncFetch));
                if (result && result.length > 0) {
                    await this.storeLIDPNMappings(result);
                    for (const pair of result) {
                        const pnDecoded = jidDecode(pair.pn);
                        const pnUser = pnDecoded?.user;
                        if (!pnUser)
                            continue;
                        const lidUser = jidDecode(pair.lid)?.user;
                        if (!lidUser)
                            continue;
                        for (const device of (usyncFetch[pair.pn] || [])) {
                            const deviceSpecificLid = `${lidUser}${device ? `:${device}` : ''}@${device === 99 ? 'hosted.lid' : 'lid'}`;
                            const deviceSpecificPn = `${pnUser}${device ? `:${device}` : ''}@${device === 99 ? 'hosted' : 's.whatsapp.net'}`;
                            successfulPairs[deviceSpecificPn] = { lid: deviceSpecificLid, pn: deviceSpecificPn };
                        }
                    }
                }
                else {
                    return null;
                }
            }
            catch (e) {
                return null;
            }
        }
        return Object.values(successfulPairs).length > 0 ? Object.values(successfulPairs) : null;
    }
    async getPNsForLIDs(lids) {
        if (lids.length === 0)
            return null;
        const result = [];
        const missingLids = [];
        for (const lid of lids) {
            if (!lid)
                continue;
            const decoded = jidDecode(lid);
            if (!decoded?.user)
                continue;
            const lidUser = decoded.user;
            const pnUser = this.mappingCache.get(`lid:${lidUser}`);
            if (!pnUser || typeof pnUser !== 'string') {
                missingLids.push(lidUser);
            }
            else {
                const lidDevice = decoded.device !== undefined ? decoded.device : 0;
                const pnJid = `${pnUser}${lidDevice ? `:${lidDevice}` : ''}@${decoded.domainType === WAJIDDomains.HOSTED_LID ? 'hosted' : 's.whatsapp.net'}`;
                result.push({ lid, pn: pnJid });
            }
        }
        if (missingLids.length > 0) {
            try {
                const dbKeys = missingLids.map(l => `${l}_reverse`);
                const stored = await this.keys.get('lid-mapping', dbKeys);
                for (const lidUser of missingLids) {
                    const pnUser = stored[`${lidUser}_reverse`];
                    if (pnUser && typeof pnUser === 'string') {
                        this.mappingCache.set(`lid:${lidUser}`, pnUser);
                        for (const lid of lids) {
                            if (!isLidUser(lid))
                                continue;
                            const decoded = jidDecode(lid);
                            if (decoded && decoded.user === lidUser) {
                                const lidDevice = decoded.device !== undefined ? decoded.device : 0;
                                const pnJid = `${pnUser}${lidDevice ? `:${lidDevice}` : ''}@${decoded.domainType === WAJIDDomains.HOSTED_LID ? 'hosted' : 's.whatsapp.net'}`;
                                result.push({ lid, pn: pnJid });
                            }
                        }
                    }
                }
            }
            catch (e) { }
        }
        return result.length > 0 ? result : null;
    }
    async getPNForLID(lid) {
        if (!lid)
            return null;
        if (this.inflightLIDLookups.has(lid)) {
            return (await this.inflightLIDLookups.get(lid))?.[0]?.pn || null;
        }
        const promise = this.getPNsForLIDs([lid]);
        this.inflightLIDLookups.set(lid, promise);
        try {
            return (await promise)?.[0]?.pn || null;
        }
        finally {
            this.inflightLIDLookups.delete(lid);
        }
    }
}
//# sourceMappingURL=lid-mapping.js.map