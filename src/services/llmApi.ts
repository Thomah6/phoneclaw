import { LLM_API_CONFIG } from '../config/api';

// ==================== REQUÊTE DE BASE ====================
export async function chatCompletion(messages: any[], options: any = {}) {
  // Use the loaded user settings or fallback to default config
  const baseUrl = options.baseUrl || LLM_API_CONFIG.BASE_URL;
  const apiKey = options.apiKey || LLM_API_CONFIG.API_KEY;

  if (!apiKey) {
    throw new Error('API Key missing. Please insert your key in the settings.');
  }

  const {
    model = 'gpt-4o',
    max_tokens = 1024,
    temperature = 0.7,
    top_p = 1,
    frequency_penalty = 0,
    stream = false,
  } = options;

  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens,
      temperature,
      top_p,
      frequency_penalty,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error?.error?.message || `HTTP ${response.status}`);
  }

  return await response.json();
}

// ==================== RACCOURCIS ====================

// Message simple
export async function sendMessage(userMessage: string, model: string = 'gpt-4o', options: any = {}) {
  const messages = [
    { role: 'user', content: userMessage },
  ];

  const data = await chatCompletion(messages, { model, ...options });
  return data.choices[0].message.content;
}

// Avec system prompt
export async function sendWithSystem(systemPrompt: string, userMessage: string, model: string = 'gpt-4o', options: any = {}) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const data = await chatCompletion(messages, { model, ...options });
  return data.choices[0].message.content;
}

// Conversation multi-turn
export async function sendConversation(conversationHistory: any[], model: string = 'gpt-4o', options: any = {}) {
  const data = await chatCompletion(conversationHistory, { model, ...options });
  return data.choices[0].message.content;
}

// Avec toutes les options
export async function sendAdvanced(messages: any[], options: any = {}) {
  const startTime = Date.now();
  const data = await chatCompletion(messages, options);
  const latency = Date.now() - startTime;

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
    model: data.model,
    latency,
    raw: data,
  };
}
