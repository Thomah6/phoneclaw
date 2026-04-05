import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MemoryFact {
    key: string;
    value: string;
    timestamp: number;
}

const MEMORY_STORAGE_KEY = 'opendroid_memory_v1';

export class MemoryService {
    /**
     * Store a fact in the local context engine.
     * @example remember("home_address", "12 rue de la paix")
     */
    static async remember(key: string, value: string): Promise<boolean> {
        try {
            const history = await this.getAll();
            const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
            
            // Overwrite if exists, or append
            const existingIndex = history.findIndex(f => f.key === normalizedKey);
            if (existingIndex >= 0) {
                history[existingIndex] = { key: normalizedKey, value, timestamp: Date.now() };
            } else {
                history.push({ key: normalizedKey, value, timestamp: Date.now() });
            }

            await AsyncStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(history));
            return true;
        } catch (e) {
            console.error('[MemoryService] Failed to save', e);
            return false;
        }
    }

    /**
     * Retrieve a fact from the local context engine.
     * Searches by partial key match first, then full items.
     */
    static async recall(query: string): Promise<string> {
        try {
            const history = await this.getAll();
            const q = query.toLowerCase().trim();

            const match = history.find(f => f.key.includes(q) || f.value.toLowerCase().includes(q));
            if (match) {
                return `Found memory: ${match.key} = ${match.value}`;
            }
            return `No memory found for: ${query}`;
        } catch (e) {
            return `Error reading memory`;
        }
    }

    /**
     * Dump all memories (useful for injecting global context into the prompt)
     */
    static async dumpContext(): Promise<string> {
        try {
            const history = await this.getAll();
            if (history.length === 0) return "No memories saved yet.";
            return history.map(f => `- ${f.key}: ${f.value}`).join('\n');
        } catch {
            return "";
        }
    }

    private static async getAll(): Promise<MemoryFact[]> {
        const raw = await AsyncStorage.getItem(MEMORY_STORAGE_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw) as MemoryFact[];
        } catch {
            return [];
        }
    }
}
