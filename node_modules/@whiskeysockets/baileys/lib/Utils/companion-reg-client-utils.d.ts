import type { WABrowserDescription } from '../Types/index.js';
export declare enum CompanionWebClientType {
    UNKNOWN = 0,
    CHROME = 1,
    EDGE = 2,
    FIREFOX = 3,
    IE = 4,
    OPERA = 5,
    SAFARI = 6,
    ELECTRON = 7,
    UWP = 8,
    OTHER_WEB_CLIENT = 9
}
export declare const getCompanionWebClientType: ([os, browserName]: WABrowserDescription) => CompanionWebClientType;
export declare const getCompanionPlatformId: (browser: WABrowserDescription) => string;
export declare const buildPairingQRData: (ref: string, noiseKeyB64: string, identityKeyB64: string, advB64: string, browser: WABrowserDescription) => string;
