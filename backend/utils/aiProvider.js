import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
// ...existing code...

// ...existing code...

// Minimal provider adapter. Returns { generate: async ({ prompt, model }) }
function openaiAdapter() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI is not configured. Set OPENAI_API_KEY to enable AI generation.');
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return {
    generate: async ({ prompt, model, max_tokens = 400 }) => {
      const response = await client.responses.create({
        model,
        input: [
          { role: 'system', content: 'You synthesize signals into action steps.' },
          { role: 'user', content: prompt },
        ],
        max_output_tokens: max_tokens,
        store: false,
      });
      return {
        choices: [{ message: { content: response.output_text } }],
        usage: {
          prompt_tokens: response.usage?.input_tokens || 0,
          completion_tokens: response.usage?.output_tokens || 0,
          total_tokens: response.usage?.total_tokens || 0,
        },
      };
    },
  };
}

function anthropicAdapter() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic is not configured. Set ANTHROPIC_API_KEY to enable AI generation.');
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return {
    generate: async ({ prompt, model, max_tokens = 400 }) => {
      const message = await client.messages.create({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens,
        messages: [{ role: 'user', content: prompt }],
        system: 'You synthesize signals into action steps.',
      });

      // Normalize to OpenAI-like response shape
      return {
        choices: [{ message: { content: message.content[0].text } }],
        usage: {
          prompt_tokens: message.usage.input_tokens,
          completion_tokens: message.usage.output_tokens,
          total_tokens: message.usage.input_tokens + message.usage.output_tokens,
        },
      };
    },
  };
}

export default function getProvider() {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();
  if (provider === 'openai') return openaiAdapter();
  if (provider === 'anthropic' || provider === 'claude') return anthropicAdapter();
  throw new Error(`Unsupported AI provider: ${provider}`);
}

/**
 * Get OpenAI-compatible client for direct chat.completions calls
 * Used by notificationService for AI summary generation
 */
export function getAIClient() {
  const provider = (process.env.AI_PROVIDER || 'openai').toLowerCase();

  // Return OpenAI-like interface
  if (provider === 'openai' || !process.env.ANTHROPIC_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return client;
  }

  // Anthropic with OpenAI-compatible wrapper
  if (provider === 'anthropic' || provider === 'claude') {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return {
      chat: {
        completions: {
          create: async (params) => {
            const { model, messages, max_tokens, temperature } = params;
            const systemMsg = messages.find((m) => m.role === 'system');
            const userMessages = messages.filter((m) => m.role !== 'system');

            const response = await client.messages.create({
              model: model || 'claude-3-5-sonnet-20241022',
              max_tokens: max_tokens || 1024,
              temperature: temperature || 0.7,
              system: systemMsg?.content || 'You are a helpful assistant.',
              messages: userMessages,
            });

            // Normalize to OpenAI format
            return {
              choices: [{ message: { content: response.content[0].text } }],
              usage: {
                prompt_tokens: response.usage.input_tokens,
                completion_tokens: response.usage.output_tokens,
                total_tokens: response.usage.input_tokens + response.usage.output_tokens,
              },
            };
          },
        },
      },
    };
  }

  // Fallback to OpenAI
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}
