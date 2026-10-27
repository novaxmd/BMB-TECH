import { Boom } from '@hapi/boom';
import type { Agent } from 'https';
import { Readable } from 'stream';
import { URL } from 'url';
import { proto } from '../../WAProto/index.js';
import { type MediaType } from '../Defaults/index.js';
import type { DownloadableMessage, MediaConnInfo, MediaDecryptionKeyInfo, SocketConfig, WAMediaUpload, WAMediaUploadFunction, WAMessageContent, WAMessageKey } from '../Types/index.js';
import { type BinaryNode } from '../WABinary/index.js';
import type { ILogger } from './logger.js';
export declare const hkdfInfoKey: (type: MediaType) => string;
export declare const getRawMediaUploadData: (media: WAMediaUpload, mediaType: MediaType, logger?: ILogger) => Promise<{
    filePath: any;
    fileSha256: any;
    fileLength: number;
}>;
export declare function getMediaKeys(buffer: Uint8Array | string | null | undefined, mediaType: MediaType): Promise<MediaDecryptionKeyInfo>;
export declare const extractImageThumb: (bufferOrFilePath: Readable | Buffer | string, width?: number) => Promise<{
    buffer: any;
    original: {
        width: any;
        height: any;
    };
}>;
export declare const encodeBase64EncodedStringForUpload: (b64: string) => string;
export declare const generateProfilePicture: (mediaUpload: WAMediaUpload, dimensions?: {
    width: number;
    height: number;
}) => Promise<{
    img: Buffer;
}>;
export declare const mediaMessageSHA256B64: (message: WAMessageContent) => any;
export declare function getAudioDuration(buffer: Buffer | string | Readable): Promise<any>;
export declare function getAudioWaveform(buffer: Buffer | string | Readable, logger?: ILogger): Promise<Uint8Array<ArrayBuffer> | undefined>;
export declare const toReadable: (buffer: Buffer) => any;
export declare const toBuffer: (stream: Readable) => Promise<any>;
export declare const getStream: (item: WAMediaUpload, opts?: RequestInit & {
    maxContentLength?: number;
}) => Promise<{
    readonly stream: any;
    readonly type: "buffer";
} | {
    readonly stream: any;
    readonly type: "readable";
} | {
    readonly stream: any;
    readonly type: "remote";
} | {
    readonly stream: any;
    readonly type: "file";
}>;
export declare function generateThumbnail(file: string, mediaType: 'video' | 'image', options: {
    logger?: ILogger;
}): Promise<{
    thumbnail: string | undefined;
    originalImageDimensions: {
        width: number;
        height: number;
    } | undefined;
}>;
export declare const getHttpStream: (url: string | URL, options?: RequestInit & {
    isStream?: true;
}) => Promise<any>;
type EncryptedStreamOptions = {
    saveOriginalFileIfRequired?: boolean;
    logger?: ILogger;
    opts?: RequestInit;
};
export declare const encryptedStream: (media: WAMediaUpload, mediaType: MediaType, { logger, saveOriginalFileIfRequired, opts }?: EncryptedStreamOptions) => Promise<{
    mediaKey: any;
    originalFilePath: string | undefined;
    encFilePath: any;
    mac: any;
    fileEncSha256: any;
    fileSha256: any;
    fileLength: number;
}>;
export type MediaDownloadOptions = {
    startByte?: number;
    endByte?: number;
    options?: RequestInit;
};
export declare const getUrlFromDirectPath: (directPath: string) => string;
export declare const downloadContentFromMessage: ({ mediaKey, directPath, url }: DownloadableMessage, type: MediaType, opts?: MediaDownloadOptions) => Promise<any>;
export declare const downloadEncryptedContent: (downloadUrl: string, { cipherKey, iv }: MediaDecryptionKeyInfo, { startByte, endByte, options }?: MediaDownloadOptions) => Promise<any>;
export declare function extensionForMediaMessage(message: WAMessageContent): string;
type MediaUploadResult = {
    url?: string;
    direct_path?: string;
    meta_hmac?: string;
    ts?: number;
    fbid?: number;
};
export type UploadParams = {
    url: string;
    filePath: string;
    headers: Record<string, string>;
    timeoutMs?: number;
    agent?: Agent;
};
export declare const uploadWithNodeHttp: ({ url, filePath, headers, timeoutMs, agent }: UploadParams, redirectCount?: number) => Promise<MediaUploadResult | undefined>;
export declare const getWAUploadToServer: ({ customUploadHosts, fetchAgent, logger, options }: SocketConfig, refreshMediaConn: (force: boolean) => Promise<MediaConnInfo>) => WAMediaUploadFunction;
export declare const encryptMediaRetryRequest: (key: WAMessageKey, mediaKey: Buffer | Uint8Array, meId: string) => BinaryNode;
export declare const decodeMediaRetryNode: (node: BinaryNode) => {
    key: WAMessageKey;
    media?: {
        ciphertext: Uint8Array;
        iv: Uint8Array;
    };
    error?: Boom;
};
export declare const decryptMediaRetryData: ({ ciphertext, iv }: {
    ciphertext: Uint8Array;
    iv: Uint8Array;
}, mediaKey: Uint8Array, msgId: string) => proto.MediaRetryNotification;
export declare const getStatusCodeForMediaRetry: (code: number) => 200 | 412 | 404 | 418;
export {};
//# sourceMappingURL=messages-media.d.ts.map