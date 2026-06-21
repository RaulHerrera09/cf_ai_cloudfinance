import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Bindings, Variables } from './types';
import auth from './routes/auth';
import transactions from './routes/transactions';
import exportRoute from './routes/export';
import { verifyJWT } from './utils/jwt';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use('/api/*', cors());

app.get('/', (c) => c.text('CloudFinance AI API is online!'));

app.route('/api/auth', auth);
app.route('/api/transactions', transactions);
app.route('/api/export', exportRoute);

/**
 * POST /api/analyze
 * Extracts data from text using Llama 3.1 and saves it to D1.
 * Optional auth: if a valid Bearer token is present, the transaction is saved
 * under that user's account. Without a token, saves with user_id = NULL.
 */
app.post('/api/analyze', async (c) => {
  try {
    const { text } = await c.req.json();

    if (!text) return c.json({ error: 'No text provided' }, 400);

    // Resolve optional user from JWT
    let userId: string | null = null;
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ') && c.env.JWT_SECRET) {
      const payload = await verifyJWT(authHeader.slice(7), c.env.JWT_SECRET);
      if (payload) userId = payload.sub;
    }

    const aiResponse: any = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: `You are a financial data assistant. Extract info into JSON:
      {"amount": number, "description": "string", "category": "Food|Transport|Shopping|Other", "is_anomaly": boolean}.
      Respond ONLY with raw JSON.`
        },
        { role: 'user', content: text },
      ],
    });

    const responseText = aiResponse.response || aiResponse;
    const jsonMatch = responseText.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error('AI failed to return valid JSON');
    const data = JSON.parse(jsonMatch[0]);

    await c.env.DB.prepare(
      `INSERT INTO transactions (amount, description, category, is_anomaly, user_id, type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(data.amount, data.description, data.category, data.is_anomaly ? 1 : 0, userId, 'expense', new Date().toISOString())
      .run();

    return c.json({ success: true, data });

  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;
