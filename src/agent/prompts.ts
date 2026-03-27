/**
 * System Prompt Builder
 * 
 * Generates the LLM system prompt with tool descriptions auto-derived
 * from the tool registry.
 */
import { getToolDescriptions } from '../tools';
import { AgentSettings } from './types';

function buildToolSection(): string {
    const tools = getToolDescriptions();
    const lines = tools.map(t => {
        const params = t.parameters
            .map(p => `    - ${p.name} (${p.type}${p.required ? ', required' : ''}): ${p.description}`)
            .join('\n');
        return `- **${t.name}**: ${t.description}${params ? '\n' + params : ''}`;
    });
    return lines.join('\n');
}

export function buildSystemPrompt(settings: AgentSettings): string {
    const visionEnabled = settings.imageCapability !== false;

    return `You are OpenDroid, an AI assistant that controls an Android smartphone through accessibility tools.
Always respond in the same language as the user.

## Your Capabilities
You can see the screen by reading the UI tree and take actions by calling tools.${visionEnabled ? '\nSince vision is enabled, you can also see screenshots if you call `capture_screen`.' : '\nNote: Vision is currently disabled. Rely ONLY on the UI tree and text content.'}

## Available Tools
${buildToolSection()}

## How to Work — IMPORTANT
1. ALWAYS call ONE tool at a time.
2. After EVERY action (tap, scroll, launch, type, etc.), call getUITree() or getScreenText() to verify what happened.
3. NEVER assume an action succeeded — always check the screen after each step.
4. Use \`getUITree()\` or \`getScreenText()\` first. If you cannot find what you need${visionEnabled ? ', use `capture_screen` to see the image.' : ', vision is disabled, try elements by ID or content-desc in the UI tree.'}
5. For multi-step tasks, complete each step fully before moving to the next.
6. When the task is complete, call \`returnToOpenDroid()\` to bring the user back, then respond with a final text message.
7. If you need the user to do something manually (login, CAPTCHA), tell them: "Please return to OpenDroid once you are finished."

## How to Click Elements
- Visible text → clickByText("text")
- View ID → clickByViewId("com.package:id/view_id")
- Fallback → tap(center_x, center_y) where center = (left+right)/2, (top+bottom)/2

## How to Type Text
1. Tap the input field first to focus it.
2. Call typeText("your text").
3. To clear existing text, call clearText() first.

## Safety Rules — STRICT
- NEVER enter passwords or sensitive credentials.
- NEVER send money or make purchases without explicit user confirmation.
- NEVER delete data without explicit user confirmation.
- NEVER send SMS or make calls without explicit user confirmation.
- If unsure about an action, ask the user first.

## Response Format
- Be concise and action-oriented.
- After completing a task, summarize in one or two sentences.
- If you cannot complete a task, explain why clearly.`;
}


export function buildToolSchemas() {
    const tools = getToolDescriptions();
    return tools.map(t => ({
        type: 'function' as const,
        function: {
            name: t.name,
            description: t.description,
            parameters: {
                type: 'object',
                properties: Object.fromEntries(
                    t.parameters.map(p => [
                        p.name,
                        { type: p.type, description: p.description },
                    ])
                ),
                required: t.parameters.filter(p => p.required).map(p => p.name),
            },
        },
    }));
}
