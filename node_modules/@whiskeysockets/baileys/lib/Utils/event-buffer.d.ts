import type { BaileysEventEmitter, BaileysEventMap } from '../Types/index.js';
import type { ILogger } from './logger.js';
type BaileysEventData = Partial<BaileysEventMap>;
type BaileysBufferableEventEmitter = BaileysEventEmitter & {
    process(handler: (events: BaileysEventData) => void | Promise<void>): () => void;
    buffer(): void;
    createBufferedFunction<A extends any[], T>(work: (...args: A) => Promise<T>): (...args: A) => Promise<T>;
    flush(): boolean;
    isBuffering(): boolean;
};
export declare const makeEventBuffer: (logger: ILogger) => BaileysBufferableEventEmitter;
export {};
//# sourceMappingURL=event-buffer.d.ts.map