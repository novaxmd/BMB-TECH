import { proto } from '../../WAProto/index.js';
import type { KeyPair } from '../Types/index.js';
import type { BinaryNode } from '../WABinary/index.js';
import type { ILogger } from './logger.js';
export declare const makeNoiseHandler: ({ keyPair: { private: privateKey, public: publicKey }, NOISE_HEADER, logger, routingInfo }: {
    keyPair: KeyPair;
    NOISE_HEADER: Uint8Array;
    logger: ILogger;
    routingInfo?: Buffer | undefined;
}) => {
    encrypt: (plaintext: Uint8Array) => Uint8Array;
    decrypt: (ciphertext: Uint8Array) => Uint8Array;
    authenticate: (data: Uint8Array) => void;
    mixIntoKey: (data: Uint8Array) => void;
    finishInit: () => Promise<void>;
    processHandshake: ({ serverHello }: proto.HandshakeMessage, noiseKey: KeyPair) => Uint8Array<ArrayBufferLike>;
    encodeFrame: (data: Buffer | Uint8Array) => any;
    decodeFrame: (newData: Buffer | Uint8Array, onFrame: (buff: Uint8Array | BinaryNode) => void) => Promise<void>;
};
//# sourceMappingURL=noise-handler.d.ts.map