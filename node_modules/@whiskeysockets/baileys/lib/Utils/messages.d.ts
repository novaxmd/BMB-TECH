import { proto } from '../../WAProto/index.js';
import type { AnyMediaMessageContent, AnyMessageContent, MessageContentGenerationOptions, MessageGenerationOptions, MessageGenerationOptionsFromContent, MessageUserReceipt, WAMessage, WAMessageContent, WAMessageKey } from '../Types/index.js';
import type { ILogger } from './logger.js';
import { type MediaDownloadOptions } from './messages-media.js';
type ExtractByKey<T, K extends PropertyKey> = T extends Record<K, any> ? T : never;
export declare const extractUrlFromText: (text: string) => string | undefined;
export declare const generateLinkPreviewIfRequired: (text: string, getUrlInfo: MessageGenerationOptions["getUrlInfo"], logger: MessageGenerationOptions["logger"]) => Promise<import("../Types").WAUrlInfo | undefined>;
export declare const prepareWAMessageMedia: (message: AnyMediaMessageContent, options: MessageContentGenerationOptions) => Promise<proto.Message>;
export declare const prepareDisappearingMessageSettingContent: (ephemeralExpiration?: number) => proto.Message;
export declare const generateForwardMessageContent: (message: WAMessage, forceForward?: boolean) => proto.IMessage;
export declare const hasNonNullishProperty: <K extends PropertyKey>(message: AnyMessageContent, key: K) => message is ExtractByKey<AnyMessageContent, K>;
export declare const generateWAMessageContent: (message: AnyMessageContent, options: MessageContentGenerationOptions) => Promise<proto.Message>;
export declare const generateWAMessageFromContent: (jid: string, message: WAMessageContent, options: MessageGenerationOptionsFromContent) => WAMessage;
export declare const generateWAMessage: (jid: string, content: AnyMessageContent, options: MessageGenerationOptions) => Promise<WAMessage>;
export declare const getContentType: (content: proto.IMessage | undefined) => keyof proto.IMessage | undefined;
export declare const normalizeMessageContent: (content: WAMessageContent | null | undefined) => WAMessageContent | undefined;
export declare const extractMessageContent: (content: WAMessageContent | undefined | null) => WAMessageContent | undefined;
export declare const getDevice: (id: string) => "web" | "unknown" | "android" | "ios" | "desktop";
export declare const updateMessageWithReceipt: (msg: Pick<WAMessage, "userReceipt">, receipt: MessageUserReceipt) => void;
export declare const updateMessageWithReaction: (msg: Pick<WAMessage, "reactions">, reaction: proto.IReaction) => void;
export declare const updateMessageWithPollUpdate: (msg: Pick<WAMessage, "pollUpdates">, update: proto.IPollUpdate) => void;
export declare const updateMessageWithEventResponse: (msg: Pick<WAMessage, "eventResponses">, update: proto.IEventResponse) => void;
type VoteAggregation = {
    name: string;
    voters: string[];
};
export declare function getAggregateVotesInPollMessage({ message, pollUpdates }: Pick<WAMessage, 'pollUpdates' | 'message'>, meId?: string): VoteAggregation[];
type ResponseAggregation = {
    response: string;
    responders: string[];
};
export declare function getAggregateResponsesInEventMessage({ eventResponses }: Pick<WAMessage, 'eventResponses'>, meId?: string): ResponseAggregation[];
export declare const aggregateMessageKeysNotFromMe: (keys: WAMessageKey[]) => {
    jid: string;
    participant: string | undefined;
    messageIds: string[];
}[];
type DownloadMediaMessageContext = {
    reuploadRequest: (msg: WAMessage) => Promise<WAMessage>;
    logger: ILogger;
};
export declare const downloadMediaMessage: <Type extends "buffer" | "stream">(message: WAMessage, type: Type, options: MediaDownloadOptions, ctx?: DownloadMediaMessageContext) => Promise<Type extends "buffer" ? Buffer : Transform>;
export declare const assertMediaContent: (content: proto.IMessage | null | undefined) => proto.Message.IVideoMessage | proto.Message.IImageMessage | proto.Message.IAudioMessage | proto.Message.IDocumentMessage | proto.Message.IStickerMessage;
export {};
//# sourceMappingURL=messages.d.ts.map