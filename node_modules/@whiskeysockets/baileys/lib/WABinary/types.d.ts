import * as constants from './constants.js';
export type BinaryNode = {
    tag: string;
    attrs: {
        [key: string]: string;
    };
    content?: BinaryNode[] | string | Uint8Array;
};
export type BinaryNodeAttributes = BinaryNode['attrs'];
export type BinaryNodeData = BinaryNode['content'];
export type BinaryNodeCodingOptions = typeof constants;
//# sourceMappingURL=types.d.ts.map