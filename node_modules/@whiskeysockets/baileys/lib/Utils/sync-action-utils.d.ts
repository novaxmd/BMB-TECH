import { proto } from '../../WAProto/index.js';
import type { BaileysEventEmitter, BaileysEventMap, Contact } from '../Types/index.js';
import type { ILogger } from './logger.js';
export type ContactsUpsertResult = {
    event: 'contacts.upsert';
    data: Contact[];
};
export type LidMappingUpdateResult = {
    event: 'lid-mapping.update';
    data: BaileysEventMap['lid-mapping.update'];
};
export type SyncActionResult = ContactsUpsertResult | LidMappingUpdateResult;
export declare const processContactAction: (action: proto.SyncActionValue.IContactAction, id: string | undefined, logger?: ILogger) => SyncActionResult[];
export declare const emitSyncActionResults: (ev: BaileysEventEmitter, results: SyncActionResult[]) => void;
//# sourceMappingURL=sync-action-utils.d.ts.map