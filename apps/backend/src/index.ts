import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Define environment bindings
type Bindings = {
  AI: any;
  DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for frontend communication
app.use('/api/*', cors());

app.get('/', (c) => c.text('CloudFinance AI API is online!'));

/**
 * POST /api/analyze
 * Extracts data from text using Llama 3.3 and saves it to D1
 */
app.post('/api/analyze', async (c) => {
  try {
    const { text } = await c.req.json();

    if (!text) return c.json({ error: 'No text provided' }, 400);

    // 1. Inferences with Workers AI
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

    // 2. Parse AI response (Safe extraction)
    const responseText = aiResponse.response || aiResponse;
    const jsonMatch = responseText.match(/\{.*\}/s);
    if (!jsonMatch) throw new Error("AI failed to return valid JSON");
    const data = JSON.parse(jsonMatch[0]);

    // 3. Persist in D1 Database
    await c.env.DB.prepare(
      `INSERT INTO transactions (amount, description, category, is_anomaly) 
       VALUES (?, ?, ?, ?)`
    )
      .bind(data.amount, data.description, data.category, data.is_anomaly ? 1 : 0)
      .run();

    return c.json({ success: true, data });

  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/transactions
 * Retrieves history
 */
app.get('/api/transactions', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM transactions ORDER BY created_at DESC'
  ).all();
  return c.json(results);
});

export default app;