import { Boom } from '@hapi/boom';
import type { Contact } from './Contact.js';
export declare enum SyncState {
    Connecting = 0,
    AwaitingInitialSync = 1,
    Syncing = 2,
    Online = 3
}
export type WAConnectionState = 'open' | 'connecting' | 'close';
export type ConnectionState = {
    connection: WAConnectionState;
    lastDisconnect?: {
        error: Boom | Error | undefined;
        date: Date;
    };
    isNewLogin?: boolean;
    reachoutTimeLock?: ReachoutTimelockState;
    qr?: string;
    receivedPendingNotifications?: boolean;
    legacy?: {
        phoneConnected: boolean;
        user?: Contact;
    };
    isOnline?: boolean;
};
//# sourceMappingURL=State.d.ts.map

export declare enum ReachoutTimelockEnforcementType {
    DEFAULT = 0,
    BLOCKING = 1,
    SOFT = 2
}
export type ReachoutTimelockState = {
    isActive: boolean;
    timeEnforcementEnds?: Date;
    enforcementType?: ReachoutTimelockEnforcementType;
};
export declare enum NewChatMessageCappingStatusType {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    GRACE_PERIOD = "GRACE_PERIOD"
}
export declare enum NewChatMessageCappingMVStatusType {
    MV_ACTIVE = "MV_ACTIVE",
    MV_INACTIVE = "MV_INACTIVE"
}
export declare enum NewChatMessageCappingOTEStatusType {
    OTE_ACTIVE = "OTE_ACTIVE",
    OTE_INACTIVE = "OTE_INACTIVE"
}
export type NewChatMessageCapInfo = {
    new_chat_message_cap?: string;
    messaging_tier?: string;
    mv_status?: NewChatMessageCappingMVStatusType;
    ote_status?: NewChatMessageCappingOTEStatusType;
    days_until_reset?: string;
    capping_status?: NewChatMessageCappingStatusType;
    grace_period_expiration_ts?: string;
};
