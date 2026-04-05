import { Tool } from './index';
import { MacroService, MacroAction } from '../services/MacroService';

export const saveMacroTool: Tool = {
    name: 'saveMacro',
    description: 'Save a sequence of UI actions as a reusable macro. Use this when the user asks you to "learn" or "save" a workflow.',
    parameters: [
        { name: 'name', type: 'string', description: 'Name of the macro (e.g. order_coffee, msg_boss)', required: true },
        { name: 'actionsJson', type: 'string', description: 'A JSON stringified Array of MacroAction objects', required: true }
    ],
    execute: async (args: Record<string, any>) => {
        try {
            const actions = JSON.parse(args.actionsJson as string) as MacroAction[];
            const success = await MacroService.saveMacro(args.name as string, actions);
            return success ? `Successfully saved macro '${args.name}'.` : `Failed to save macro.`;
        } catch {
            return `Failed to parse actionsJson.`;
        }
    }
};

export const executeMacroTool: Tool = {
    name: 'executeMacro',
    description: 'Instantly execute a previously saved macro workflow without needing to reason through each step.',
    parameters: [
        { name: 'name', type: 'string', description: 'The name of the macro to run.', required: true }
    ],
    execute: async (args: Record<string, any>) => {
        return await MacroService.executeMacro(args.name as string);
    }
};

export const macroTools = [saveMacroTool, executeMacroTool];
