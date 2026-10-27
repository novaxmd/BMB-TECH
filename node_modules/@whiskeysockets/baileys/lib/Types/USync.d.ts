import type { BinaryNode } from '../WABinary/index.js';
import { USyncUser } from '../WAUSync/index.js';
export interface USyncQueryProtocol {
    name: string;
    getQueryElement: () => BinaryNode;
    getUserElement: (user: USyncUser) => BinaryNode | null;
    parser: (data: BinaryNode) => unknown;
}
//# sourceMappingURL=USync.d.ts.map