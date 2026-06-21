# CloudFinance AI — Project Context

## What CloudFinance AI Does

CloudFinance AI is a personal finance tracking application that lets users record expenses and income through natural language — just type "I spent $45 on dinner with friends" and the AI extracts the structured data automatically. The application runs entirely on Cloudflare's edge network with no traditional server infrastructure.

Core user flow (after improvements):
1. User registers and logs in
2. User types a natural language description of a transaction
3. Llama 3.1 (running at the edge via Workers AI) extracts amount, category, and anomaly flag
4. Transaction is saved to D1 (Cloudflare's edge SQL database) under the user's account
5. User sees their transaction history, spending distribution chart, and AI analysis
6. User exports their transaction history as CSV

---

## Why This Project Matters

### Target Audience

This is a portfolio project aimed at UK/EU fintech recruiters and companies building on Cloudflare Workers or other edge platforms. Secondary audience: Cloudflare ecosystem developers interested in production patterns for Workers AI + D1 + auth.

### What Differentiates It

Most student portfolio projects run on Node.js + Express (or Next.js) deployed to Heroku or Vercel. This project demonstrates:

1. **Edge runtime proficiency** — Workers run in V8 isolates, not Node.js. No `require()`, no file system, no Node built-ins. All crypto via Web Crypto API (`crypto.subtle`). This is a meaningfully different skill set.

2. **On-device LLM inference at the edge** — Workers AI runs Llama 3.1 inside Cloudflare's network, milliseconds from the user. No OpenAI API calls, no external AI service dependency, no per-token billing.

3. **Edge SQL** — D1 is SQLite replicated globally at the edge. Demonstrating D1 migrations, per-user data isolation, and query patterns on a free-tier edge database is directly applicable to Cloudflare's enterprise customers.

4. **Zero cold starts** — Cloudflare Workers use a completely different concurrency model than Lambda or Cloud Run. The application responds in sub-millisecond start time globally.

---

## Portfolio Success Metrics

A recruiter visiting the live demo should be able to complete this flow within 3 minutes:

1. Land on the app — immediately see it is alive and visually professional
2. Register a new account (or use demo credentials) — under 30 seconds
3. Add 2–3 transactions via natural language — AI responds in under 5 seconds
4. See the spending chart update in real time
5. Download transaction history as CSV
6. Understand the tech stack from the README in under 1 minute

If any step takes more than 30 seconds or produces a confusing error, the demo fails.

---

## Cloudflare Platform Rationale

Cloudflare Workers was chosen over alternatives (Vercel Edge Functions, AWS Lambda, Railway) for three reasons:

1. **Integrated AI binding** — Workers AI puts Llama 3.1 one function call away from the Worker, with no API key management or network latency to an external service.

2. **D1 is native** — No external database connection pool, no VPC configuration, no cold start penalty from connecting to RDS. D1 is bound directly to the Worker.

3. **Pages + Workers deploy from the same CLI** — `wrangler deploy` handles both. One platform, one tool, one account.

---

## Demo Credentials (Phase 4)

To be created in Phase 4 after auth is implemented:

- **Email:** `demo@cloudfinance.dev`
- **Password:** Set in Phase 4
- **Pre-seeded data:** 15–20 realistic transactions across categories (Food, Transport, Shopping, Utilities, Other) covering the last 3 months

These credentials will be published in the README to allow zero-friction recruiter access.
