import { Boom } from '@hapi/boom';
export var SyncState;
(function (SyncState) {
    SyncState[SyncState["Connecting"] = 0] = "Connecting";
    SyncState[SyncState["AwaitingInitialSync"] = 1] = "AwaitingInitialSync";
    SyncState[SyncState["Syncing"] = 2] = "Syncing";
    SyncState[SyncState["Online"] = 3] = "Online";
})(SyncState || (SyncState = {}));

export var ReachoutTimelockEnforcementType;
(function (ReachoutTimelockEnforcementType) {
    ReachoutTimelockEnforcementType[ReachoutTimelockEnforcementType["DEFAULT"] = 0] = "DEFAULT";
    ReachoutTimelockEnforcementType[ReachoutTimelockEnforcementType["BLOCKING"] = 1] = "BLOCKING";
    ReachoutTimelockEnforcementType[ReachoutTimelockEnforcementType["SOFT"] = 2] = "SOFT";
})(ReachoutTimelockEnforcementType || (ReachoutTimelockEnforcementType = {}));
export var NewChatMessageCappingStatusType;
(function (NewChatMessageCappingStatusType) {
    NewChatMessageCappingStatusType["ACTIVE"] = "ACTIVE";
    NewChatMessageCappingStatusType["INACTIVE"] = "INACTIVE";
    NewChatMessageCappingStatusType["GRACE_PERIOD"] = "GRACE_PERIOD";
})(NewChatMessageCappingStatusType || (NewChatMessageCappingStatusType = {}));
export var NewChatMessageCappingMVStatusType;
(function (NewChatMessageCappingMVStatusType) {
    NewChatMessageCappingMVStatusType["MV_ACTIVE"] = "MV_ACTIVE";
    NewChatMessageCappingMVStatusType["MV_INACTIVE"] = "MV_INACTIVE";
})(NewChatMessageCappingMVStatusType || (NewChatMessageCappingMVStatusType = {}));
export var NewChatMessageCappingOTEStatusType;
(function (NewChatMessageCappingOTEStatusType) {
    NewChatMessageCappingOTEStatusType["OTE_ACTIVE"] = "OTE_ACTIVE";
    NewChatMessageCappingOTEStatusType["OTE_INACTIVE"] = "OTE_INACTIVE";
})(NewChatMessageCappingOTEStatusType || (NewChatMessageCappingOTEStatusType = {}));
//# sourceMappingURL=State.js.map