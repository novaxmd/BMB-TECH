import type { Contact } from './Contact.js';
import type { WAMessageAddressingMode } from './Message.js';
export type GroupParticipant = Contact & {
    isAdmin?: boolean;
    isSuperAdmin?: boolean;
    admin?: 'admin' | 'superadmin' | null;
};
export type ParticipantAction = 'add' | 'remove' | 'promote' | 'demote' | 'modify';
export type RequestJoinAction = 'created' | 'revoked' | 'rejected';
export type RequestJoinMethod = 'invite_link' | 'linked_group_join' | 'non_admin_add' | undefined;
export interface GroupMetadata {
    id: string;
    notify?: string;
    addressingMode?: WAMessageAddressingMode;
    owner: string | undefined;
    ownerPn?: string | undefined;
    ownerUsername?: string | undefined;
    owner_country_code?: string | undefined;
    subject: string;
    subjectOwner?: string;
    subjectOwnerPn?: string;
    subjectOwnerUsername?: string;
    subjectTime?: number;
    creation?: number;
    desc?: string;
    descOwner?: string;
    descOwnerPn?: string;
    descOwnerUsername?: string;
    descId?: string;
    descTime?: number;
    linkedParent?: string;
    restrict?: boolean;
    announce?: boolean;
    memberAddMode?: boolean;
    joinApprovalMode?: boolean;
    isCommunity?: boolean;
    isCommunityAnnounce?: boolean;
    size?: number;
    participants: GroupParticipant[];
    ephemeralDuration?: number;
    inviteCode?: string;
    author?: string;
    authorPn?: string;
    authorUsername?: string;
}
export interface WAGroupCreateResponse {
    status: number;
    gid?: string;
    participants?: [{
        [key: string]: {};
    }];
}
export interface GroupModificationResponse {
    status: number;
    participants?: {
        [key: string]: {};
    };
}
//# sourceMappingURL=GroupMetadata.d.ts.map