import type { KeyPair } from '../Types/index.js';
export { md5, hkdf } from 'whatsapp-rust-bridge';
export declare const generateSignalPubKey: (pubKey: Uint8Array | Buffer) => any;
export declare const Curve: {
    generateKeyPair: () => KeyPair;
    sharedKey: (privateKey: Uint8Array, publicKey: Uint8Array) => any;
    sign: (privateKey: Uint8Array, buf: Uint8Array) => any;
    verify: (pubKey: Uint8Array, message: Uint8Array, signature: Uint8Array) => boolean;
};
export declare const signedKeyPair: (identityKeyPair: KeyPair, keyId: number) => {
    keyPair: KeyPair;
    signature: any;
    keyId: number;
};
export declare function aesEncryptGCM(plaintext: Uint8Array, key: Uint8Array, iv: Uint8Array, additionalData: Uint8Array): any;
export declare function aesDecryptGCM(ciphertext: Uint8Array, key: Uint8Array, iv: Uint8Array, additionalData: Uint8Array): any;
export declare function aesEncryptCTR(plaintext: Uint8Array, key: Uint8Array, iv: Uint8Array): any;
export declare function aesDecryptCTR(ciphertext: Uint8Array, key: Uint8Array, iv: Uint8Array): any;
export declare function aesDecrypt(buffer: Uint8Array, key: Uint8Array): any;
export declare function aesDecryptWithIV(buffer: Uint8Array, key: Uint8Array, IV: Uint8Array): any;
export declare function aesEncrypt(buffer: Uint8Array, key: Uint8Array): any;
export declare function aesEncrypWithIV(buffer: Buffer, key: Buffer, IV: Buffer): any;
export declare function hmacSign(buffer: Buffer | Uint8Array, key: Buffer | Uint8Array, variant?: 'sha256' | 'sha512'): any;
export declare function sha256(buffer: Buffer): any;
export declare function derivePairingCodeKey(pairingCode: string, salt: Buffer): Promise<Buffer>;
//# sourceMappingURL=crypto.d.ts.map