import { Mutex as AsyncMutex } from 'async-mutex';
export const makeMutex = () => {
    const mutex = new AsyncMutex();
    return {
        mutex(code) {
            return mutex.runExclusive(code);
        }
    };
};
export const makeKeyedMutex = () => {
    const map = new Map();
    return {
        async mutex(key, task) {
            let entry = map.get(key);
            if (!entry) {
                entry = { mutex: new AsyncMutex(), refCount: 0 };
                map.set(key, entry);
            }
            entry.refCount++;
            try {
                return await entry.mutex.runExclusive(task);
            }
            finally {
                entry.refCount--;
                if (entry.refCount === 0 && map.get(key) === entry) {
                    map.delete(key);
                }
            }
        }
    };
};
//# sourceMappingURL=make-mutex.js.map