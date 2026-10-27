import type { WAMediaUploadFunction, WAUrlInfo } from '../Types/index.js';
import type { ILogger } from './logger.js';
export type URLGenerationOptions = {
    thumbnailWidth: number;
    fetchOpts: {
        timeout: number;
        proxyUrl?: string;
        headers?: HeadersInit;
    };
    uploadImage?: WAMediaUploadFunction;
    logger?: ILogger;
};
export declare const getUrlInfo: (text: string, opts?: URLGenerationOptions) => Promise<WAUrlInfo | undefined>;
//# sourceMappingURL=link-preview.d.ts.map