import AsyncStorage from '@react-native-async-storage/async-storage';
import ClawAccessibilityModule from '../native/ClawAccessibilityModule';

export interface MacroAction {
    type: 'tap' | 'type' | 'wait' | 'pressBack' | 'pressHome';
    x?: number;
    y?: number;
    text?: string;
    durationMs?: number;
}

export interface Macro {
    name: string;
    actions: MacroAction[];
}

const MACRO_STORAGE_KEY = 'opendroid_macros_v1';

export class MacroService {
    /** Save a recorded macro */
    static async saveMacro(name: string, actions: MacroAction[]): Promise<boolean> {
        try {
            const macros = await this.getAll();
            const existingIndex = macros.findIndex(m => m.name.toLowerCase() === name.toLowerCase());
            
            if (existingIndex >= 0) {
                macros[existingIndex].actions = actions;
            } else {
                macros.push({ name, actions });
            }
            
            await AsyncStorage.setItem(MACRO_STORAGE_KEY, JSON.stringify(macros));
            return true;
        } catch {
            return false;
        }
    }

    /** Replay a macro natively at high speed without LLM overhead */
    static async executeMacro(name: string): Promise<string> {
        const macros = await this.getAll();
        const macro = macros.find(m => m.name.toLowerCase() === name.toLowerCase());
        
        if (!macro) return `Macro '${name}' not found.`;

        // Execute actions sequentially
        for (const action of macro.actions) {
            switch (action.type) {
                case 'tap':
                    if (action.x && action.y) await ClawAccessibilityModule.tap(action.x, action.y);
                    break;
                case 'type':
                    if (action.text) {
                        await ClawAccessibilityModule.typeText(action.text);
                        // Force enter key workaround
                        if (action.text.includes('\n')) await ClawAccessibilityModule.typeText('\n');
                    }
                    break;
                case 'pressBack':
                    await ClawAccessibilityModule.pressBack();
                    break;
                case 'pressHome':
                    await ClawAccessibilityModule.pressHome();
                    break;
                case 'wait':
                    if (action.durationMs) {
                        await new Promise(resolve => setTimeout(resolve, action.durationMs));
                    }
                    break;
            }
            // Small implicit delay between actions to let UI catch up
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        return `Successfully executed macro '${name}'.`;
    }

    private static async getAll(): Promise<Macro[]> {
        const raw = await AsyncStorage.getItem(MACRO_STORAGE_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw) as Macro[];
        } catch {
            return [];
        }
    }
}
