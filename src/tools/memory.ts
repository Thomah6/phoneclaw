import { Tool } from './index';
import { MemoryService } from '../services/MemoryService';

export const recordMemoryTool: Tool = {
    name: 'recordMemory',
    description: 'Save an important fact or preference about the user persistently (e.g. relationship names, addresses, preferences). Always use this when the user tells you something to remember.',
    parameters: [
        { name: 'key', type: 'string', description: 'A short, unique, snake_case key (e.g. boss_name, home_address)', required: true },
        { name: 'value', type: 'string', description: 'The value to store (e.g. Hugo, 12 rue de la paix)', required: true }
    ],
    execute: async (args: Record<string, any>) => {
        const success = await MemoryService.remember(args.key, args.value);
        return success ? `Successfully remembered: ${args.key} = ${args.value}` : `Failed to save memory.`;
    }
};

export const recallMemoryTool: Tool = {
    name: 'recallMemory',
    description: 'Retrieve a previously saved fact or preference about the user using a search query. Use this when the user refers to something implicit like "my boss" or "home".',
    parameters: [
        { name: 'query', type: 'string', description: 'The search query (e.g. boss, home, address)', required: true }
    ],
    execute: async (args: Record<string, any>) => {
        return await MemoryService.recall(args.query as string);
    }
};
