import type { BinaryNode } from '../WABinary/index.js';
export type MessageType = 'message' | 'call' | 'receipt' | 'notification';
export type OfflineNodeProcessorDeps = {
    isWsOpen: () => boolean;
    onUnexpectedError: (error: Error, msg: string) => void;
    yieldToEventLoop: () => Promise<void>;
};
export declare function makeOfflineNodeProcessor(nodeProcessorMap: Map<MessageType, (node: BinaryNode) => Promise<void>>, deps: OfflineNodeProcessorDeps, batchSize?: number): {
    enqueue: (type: MessageType, node: BinaryNode) => void;
};
//# sourceMappingURL=offline-node-processor.d.ts.map