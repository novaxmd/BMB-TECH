export declare enum LabelAssociationType {
    Chat = "label_jid",
    Message = "label_message"
}
export type LabelAssociationTypes = `${LabelAssociationType}`;
export interface ChatLabelAssociation {
    type: LabelAssociationType.Chat;
    chatId: string;
    labelId: string;
}
export interface MessageLabelAssociation {
    type: LabelAssociationType.Message;
    chatId: string;
    messageId: string;
    labelId: string;
}
export type LabelAssociation = ChatLabelAssociation | MessageLabelAssociation;
export interface ChatLabelAssociationActionBody {
    labelId: string;
}
export interface MessageLabelAssociationActionBody {
    labelId: string;
    messageId: string;
}
//# sourceMappingURL=LabelAssociation.d.ts.map