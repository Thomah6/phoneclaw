/**
 * HistoryService — Conversation persistence via AsyncStorage
 *
 * Saves, loads, and deletes conversation sessions locally.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UIMessage } from '../agent/types';

export interface Conversation {
    id: string;
    title: string;
    messages: UIMessage[];
    date: number;
}

const PREFIX = 'opendroid_conv_';

/**
 * Save the current conversation to local storage.
 * Title = first user message (truncated to 60 chars).
 */
export async function saveConversation(messages: UIMessage[]): Promise<string | null> {
    if (messages.length === 0) return null;

    const id = String(Date.now());
    const firstUserMsg = messages.find(m => m.type === 'user');
    const title = firstUserMsg?.text?.slice(0, 60) || 'Conversation';

    const conv: Conversation = { id, title, messages, date: Date.now() };

    try {
        await AsyncStorage.setItem(PREFIX + id, JSON.stringify(conv));
        return id;
    } catch (e) {
        console.warn('[HistoryService] Failed to save:', e);
        return null;
    }
}

/**
 * Load all saved conversations, sorted by date (newest first).
 */
export async function loadHistory(): Promise<Conversation[]> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const convKeys = keys.filter(k => k.startsWith(PREFIX));

        if (convKeys.length === 0) return [];

        const results = await AsyncStorage.multiGet(convKeys);
        return results
            .map(([, value]) => {
                if (!value) return null;
                try {
                    return JSON.parse(value) as Conversation;
                } catch {
                    return null;
                }
            })
            .filter((c): c is Conversation => c !== null)
            .sort((a, b) => b.date - a.date);
    } catch (e) {
        console.warn('[HistoryService] Failed to load:', e);
        return [];
    }
}

/**
 * Delete a single conversation by ID.
 */
export async function deleteConversation(id: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(PREFIX + id);
    } catch (e) {
        console.warn('[HistoryService] Failed to delete:', e);
    }
}

/**
 * Delete all saved conversations.
 */
export async function clearAllHistory(): Promise<void> {
    try {
        const keys = await AsyncStorage.getAllKeys();
        const convKeys = keys.filter(k => k.startsWith(PREFIX));
        if (convKeys.length > 0) {
            await AsyncStorage.multiRemove(convKeys);
        }
    } catch (e) {
        console.warn('[HistoryService] Failed to clear:', e);
    }
}
