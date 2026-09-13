import type { Bindings } from '../types';
import { normalizeTransactionDraft, TransactionValidationError, type TransactionDraft } from './transactions.ts';

export async function interpretTransaction(ai: Bindings['AI'], text: string): Promise<TransactionDraft> {
  if (!text.trim() || text.trim().length > 1000) {
    throw new TransactionValidationError('description', 'Describe the transaction in 1 to 1,000 characters.');
  }

  const aiResponse: any = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
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
  const responseText = aiResponse.response || aiResponse;
  const jsonMatch = String(responseText).match(/\{.*\}/s);
  if (!jsonMatch) throw new Error('The AI response could not be interpreted. Try a more specific description.');
  return normalizeTransactionDraft(JSON.parse(jsonMatch[0]));
}
