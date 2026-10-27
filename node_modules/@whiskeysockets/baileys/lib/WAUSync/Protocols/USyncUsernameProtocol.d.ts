import type { USyncQueryProtocol } from '../../Types/USync.js';
import { type BinaryNode } from '../../WABinary/index.js';
import { USyncUser } from '../USyncUser.js';
export declare class USyncUsernameProtocol implements USyncQueryProtocol {
    name: string;
    getQueryElement(): BinaryNode;
    getUserElement(user: USyncUser): BinaryNode | null;
    parser(node: BinaryNode): string | null;
}
//# sourceMappingURL=USyncUsernameProtocol.d.ts.map