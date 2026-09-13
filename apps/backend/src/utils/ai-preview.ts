import type { Bindings } from '../types';
import { normalizeTransactionDraft, TransactionValidationError, type TransactionDraft } from './transactions.ts';

export type AIProcessingCode = 'AI_MODEL_ERROR' | 'AI_TIMEOUT' | 'AI_RESPONSE_PARSE_ERROR';

export class AIProcessingError extends Error {
  readonly code: AIProcessingCode;

  constructor(code: AIProcessingCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = 'AIProcessingError';
  }
}

type InterpretOptions = { timeoutMs?: number };

export async function interpretTransaction(ai: Bindings['AI'], text: string, options: InterpretOptions = {}): Promise<TransactionDraft> {
  if (!text.trim() || text.trim().length > 1000) {
    throw new TransactionValidationError('description', 'Describe the transaction in 1 to 1,000 characters.');
  }

  const aiRequest = ai.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
    messages: [
      {
        role: 'system',
        content: `Extract one financial transaction as raw JSON only:
        {"amount": number, "currency": "three-letter ISO code", "description": "string", "category": "string", "type": "income|expense", "is_anomaly": boolean}.
        Infer income only when the text clearly describes money received. Default currency to USD only when none is stated.`,
      },
      { role: 'user', content: text.trim() },
    ],
  });

  let aiResponse: any;
  try {
    aiResponse = await Promise.race([
      aiRequest,
      new Promise<never>((_, reject) => setTimeout(() => reject(new AIProcessingError('AI_TIMEOUT', 'The AI preview timed out. Please try again.')), options.timeoutMs ?? 12000)),
    ]);
  } catch (error) {
    if (error instanceof AIProcessingError) throw error;
    throw new AIProcessingError('AI_MODEL_ERROR', 'The AI model could not process this preview.', { cause: error });
  }

  const responseText = aiResponse.response || aiResponse;
  const jsonMatch = String(responseText).match(/\{.*\}/s);
  if (!jsonMatch) throw new AIProcessingError('AI_RESPONSE_PARSE_ERROR', 'The AI returned an unreadable preview. Try a more specific description.');
  try {
    return normalizeTransactionDraft(JSON.parse(jsonMatch[0]));
  } catch (error) {
    if (error instanceof TransactionValidationError) throw error;
    throw new AIProcessingError('AI_RESPONSE_PARSE_ERROR', 'The AI returned an unreadable preview. Try a more specific description.', { cause: error });
  }
}
