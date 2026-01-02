# cf_ai_cloudfinance 💸

An AI-powered financial assistant built entirely on **Cloudflare's Global Network**. This application leverages Large Language Models (LLMs) to analyze personal spending from natural language, categorize expenses automatically, and detect financial anomalies in real-time.

## 🚀 Cloudflare Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **LLM** | Workers AI | Powered by `@cf/meta/llama-3.1-8b-instruct` for NLP extraction. |
| **Coordination** | Cloudflare Workers | Serverless backend logic using the **Hono** framework. |
| **Frontend** | Cloudflare Pages | Interactive React SPA built with **Vite** and **Tailwind CSS v4**. |
| **Memory / State** | Cloudflare D1 | Serverless SQL database (SQLite) for persistent transaction storage. |

## ✨ Key Features

- **Natural Language Processing (NLP)**: Process unstructured text like *"I spent 45 dollars on a burger today"* to extract structured data.
- **Data Insights & Visualization**: Real-time spending distribution charts using **Recharts** to visualize category weight.
- **Automated Categorization**: Intelligent grouping of expenses into categories (Food, Transport, Utilities, Shopping, etc.).
- **Anomaly Detection**: AI-driven logic to flag unusual spending patterns or high-value transactions based on user history.
- **Edge Performance**: Low-latency execution thanks to Cloudflare's global edge network.

## 🛠️ Local Development

### Prerequisites
- Node.js (v18+) & npm.
- Cloudflare Wrangler CLI (`npm install -g wrangler`).
- Active Cloudflare account.

### 1. Repository Setup
```bash
# Ensure your repository name follows the required prefix
# git clone <your-repo-link>
cd cf_ai_cloudfinance

# Backend Configuration (Cloudflare Workers)
cd apps/backend
npm install

# Initialize local D1 database with the provided schema
npx wrangler d1 execute cf_ai_db --local --file=../../data/schema.sql

# Start the local development server
npm run dev

#Frontend Configuration (React + Vite)
cd apps/frontend
npm install

# Run the frontend locally
npm run dev

#Note: For local development, ensure the API_URL in apps/frontend/src/App.tsx points to http://localhost:8787/api

```

## 🌍 Deployment
```bash
#Database & Backend
# Create and initialize the remote D1 database
npx wrangler d1 execute cf_ai_db --remote --file=../../data/schema.sql

# Deploy the Worker
cd apps/backend && npm run deploy


#Frontend (Pages)
# Build the production assets
cd apps/frontend && npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name cloudfinance-ai

```

## 📂 Project Structure
```bash
cf_ai_cloudfinance/
├── apps/
│   ├── backend/    # Cloudflare Worker (Hono + Workers AI + D1)
│   └── frontend/   # React Dashboard (Tailwind v4 + Recharts)
├── data/
│   └── schema.sql  # SQL database schema for D1
├── README.md       # Main documentation
└── PROMPTS.md      # Detailed AI Prompt Engineering log

```

## 🔗 Live Demo
**Look here**: https://84b5031a.cloudfinance-ai.pages.dev/



**Author**: Raul Herrera 

**Background**: Computer Systems Engineering Student at Universidad Lamar (2024-2026).

**Specialization**: Data Analysis (TripleTen Bootcamp 2025-2026).

**Project Goal**: Demonstrate full-stack AI capabilities using Cloudflare's developer platform.


