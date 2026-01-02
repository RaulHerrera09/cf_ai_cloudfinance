# CloudFinance AI - Prompt Engineering Document

This document records the interaction with AI models to develop the CloudFinance AI application. It covers architecture design, database schema, AI logic, and frontend visualization.

## 1. Project Scaffolding & Architecture
**Prompt:**
> "I need to build a full-stack AI application on Cloudflare. Create a monorepo structure called `cf_ai_cloudfinance` with two main folders: `apps/backend` (Cloudflare Worker with Hono and TypeScript) and `apps/frontend` (React with Vite and Tailwind CSS v4). The app will analyze financial expenses using LLMs."

## 2. D1 Database Schema Design
**Prompt:**
> "Generate a SQL schema for a Cloudflare D1 database. The table should be named `transactions` and include the following fields: 
> - `id`: Integer Primary Key Autoincrement
> - `amount`: Real (Numeric value of the expense)
> - `currency`: Text (ISO code like USD or MXN)
> - `description`: Text (What was bought)
> - `category`: Text (Food, Transport, Shopping, etc.)
> - `is_anomaly`: Boolean (Flag for unusual spending)
> - `created_at`: Timestamp (Default current time)
> Provide the `schema.sql` file."

## 3. Transaction Parser & AI Logic (Llama 3.1)
**Prompt:**
> "Configure a Cloudflare Worker to use Workers AI with the `@cf/meta/llama-3.1-8b-instruct` model. Write a system prompt for a financial data extractor. The AI must take a user's natural language input (e.g., 'I spent 50 bucks on sushi') and return ONLY a valid JSON object with the following structure:
> {
>   "amount": number,
>   "currency": "string",
>   "description": "string",
>   "category": "Food" | "Transport" | "Utilities" | "Shopping" | "Other",
>   "is_anomaly": boolean
> }
> Logic: Set `is_anomaly` to true if the expense is over $500 or if the category seems highly unusual for the description."

## 4. Frontend Development & Glassmorphism UI
**Prompt:**
> "Create a high-end React dashboard using Tailwind CSS v4. The UI should feature:
> - A dark-themed 'Fintech' aesthetic (Slate-950 background).
> - Glassmorphism effects (backdrop-blur, borders with low opacity).
> - Responsive layout with a center input field for natural language entry.
> - A summary section showing total spent and anomaly count.
> - A table list to display history fetched from a Cloudflare Worker API."

## 5. Data Visualization with Recharts
**Prompt:**
> "I have an array of financial transactions in React. Use the **Recharts** library to build a Donut Chart. The chart should:
> 1. Aggregate the total amount spent per category.
> 2. Use a professional indigo/purple color palette.
> 3. Show a custom Tooltip with a dark theme.
> 4. Display a legend at the bottom.
> Provide the logic for data transformation using `.reduce()`."

## 6. Debugging: Tailwind CSS v4 Integration
**Prompt:**
> "I'm getting a PostCSS error: 'The PostCSS plugin has moved to a separate package' while setting up Tailwind v4. How do I fix this manually by integrating `@tailwindcss/vite` directly into the Vite config instead of using the old PostCSS file?"

## 7. API Integration (Frontend to Backend)
**Prompt:**
> "Write a `useEffect` hook and an `async` handle function in React to communicate with my Cloudflare Worker. It should:
> - Fetch the transaction history on mount.
> - POST new text inputs to the `/api/analyze` endpoint.
> - Update the UI state and refresh the charts automatically after a successful analysis."