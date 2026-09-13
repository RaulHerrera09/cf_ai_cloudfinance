import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, Variables } from './types';
import auth from './routes/auth';
import transactions from './routes/transactions';
import exportRoute from './routes/export';
import { verifyJWT } from './utils/jwt';
import { authMiddleware } from './middleware/auth';
import { TransactionValidationError } from './utils/transactions';
import { AIProcessingError, interpretTransaction } from './utils/ai-preview';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('/api/*', cors());

app.get('/', (c) => c.text('CloudFinance AI API is online!'));

app.route('/api/auth', auth);
app.route('/api/transactions', transactions);
app.route('/api/export', exportRoute);

app.post('/api/analyze/preview', authMiddleware, async (c) => {
  try {
    const body = await c.req.json<{ text?: unknown }>();
    if (typeof body.text !== 'string') {
      return c.json({ error: 'Describe the transaction before requesting a preview.', field: 'description' }, 400);
    }
    const data = await interpretTransaction(c.env.AI, body.text);
    return c.json({ success: true, data });
  } catch (error) {
    if (error instanceof TransactionValidationError) {
      return c.json({ success: false, error: error.message, field: error.field }, 400);
    }
    if (error instanceof AIProcessingError) {
      console.error('ai_preview_failed', { code: error.code });
      return c.json({ success: false, code: error.code, error: error.message }, error.code === 'AI_TIMEOUT' ? 504 : 502);
    }
    console.error('ai_preview_failed', { code: 'AI_MODEL_ERROR' });
    return c.json({ success: false, code: 'AI_MODEL_ERROR', error: 'The AI preview is temporarily unavailable. Please try again.' }, 502);
  }
});

/**
 * POST /api/analyze
 * Extracts data from text using Llama 3.1 and saves it to D1.
 * Optional auth: if a valid Bearer token is present, the transaction is saved
 * under that user's account. Without a token, saves with user_id = NULL.
 */
app.post('/api/analyze', async (c) => {
  try {
    const { text } = await c.req.json();

    if (typeof text !== 'string' || !text.trim()) return c.json({ error: 'No text provided' }, 400);

    // Resolve optional user from JWT
    let userId: string | null = null;
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ') && c.env.JWT_SECRET) {
      const payload = await verifyJWT(authHeader.slice(7), c.env.JWT_SECRET);
      if (payload) userId = payload.sub;
    }

    const data = await interpretTransaction(c.env.AI, text);

    await c.env.DB.prepare(
      `INSERT INTO transactions (amount, description, category, is_anomaly, user_id, type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(data.amount, data.description || null, data.category, data.is_anomaly ? 1 : 0, userId, data.type, new Date().toISOString())
      .run();

    return c.json({ success: true, data });

  } catch (error) {
    if (error instanceof AIProcessingError) {
      console.error('ai_analyze_failed', { code: error.code });
      return c.json({ success: false, code: error.code, error: error.message }, error.code === 'AI_TIMEOUT' ? 504 : 502);
    }
    console.error('ai_analyze_failed', { code: 'AI_MODEL_ERROR' });
    return c.json({ success: false, code: 'AI_MODEL_ERROR', error: 'The AI service is temporarily unavailable. Please try again.' }, 502);
  }
});

export default app;
