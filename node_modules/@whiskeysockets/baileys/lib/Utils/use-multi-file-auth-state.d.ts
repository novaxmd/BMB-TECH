import type { AuthenticationState } from '../Types/index.js';
export declare const useMultiFileAuthState: (folder: string) => Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}>;
//# sourceMappingURL=use-multi-file-auth-state.d.ts.map