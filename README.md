# CloudFinance AI — Personal Edge Ledger

CloudFinance AI es un ledger financiero personal que convierte lenguaje natural en transacciones revisables. La aplicación combina React, Cloudflare Pages, Workers AI y D1 para mantener un flujo claro: describir, revisar y registrar.

**Producción:** [cloudfinance-ai.pages.dev](https://cloudfinance-ai.pages.dev)

**Deployment verificado:** [e08a5f3f.cloudfinance-ai.pages.dev](https://e08a5f3f.cloudfinance-ai.pages.dev)

**API:** [backend.raulherreradelgadillo09.workers.dev](https://backend.raulherreradelgadillo09.workers.dev)

## Qué incluye

- Registro e inicio de sesión con JWT y refresh tokens rotatorios.
- Dashboard Edge Ledger con ingresos, gastos y balance separados.
- Resúmenes por moneda con selector explícito; nunca se mezclan divisas.
- Distribución de gastos mediante barras ordenadas y una alternativa tabular accesible.
- Historial con filtros, paginación y exportación CSV.
- Alta manual de transacciones.
- Eliminación mediante confirmación contextual accesible.
- Estados loading, empty, error y success en las operaciones principales.
- Diseño responsive y accesible, con controles aptos para teclado y touch.

## Flujo IA

1. El usuario escribe una frase como `Hamburguer 150 MXN`.
2. `POST /api/analyze/preview` interpreta importe, moneda, tipo, categoría y descripción.
3. La interfaz muestra una vista previa editable.
4. Solo al confirmar se crea la transacción mediante `POST /api/transactions`.

El preview no persiste información por sí mismo. El frontend conserva la entrada ante errores, permite reintentar y evita confirmaciones duplicadas o respuestas tardías.

## Stack y despliegue

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Navegación y estado | React Router DOM 7, Zustand 5 |
| Iconos | Lucide React |
| Backend | Cloudflare Workers + Hono 4 |
| IA | Workers AI, `@cf/meta/llama-3.1-8b-instruct-fp8` |
| Persistencia | Cloudflare D1 (`DB` → `cf_ai_db`) |
| Hosting | Cloudflare Pages (SPA) |

El dashboard se carga mediante `React.lazy`/`Suspense` y code splitting por ruta. El binding de Workers AI es `AI`.

## API

Todas las rutas protegidas requieren `Authorization: Bearer <access-token>`.

| Método | Ruta | Propósito |
|---|---|---|
| POST | `/api/auth/register` | Crear una cuenta |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/refresh` | Renovar tokens |
| POST | `/api/auth/logout` | Revocar el refresh token |
| GET | `/api/auth/me` | Obtener el usuario autenticado |
| POST | `/api/analyze/preview` | Interpretar texto sin persistir; requiere autenticación |
| POST | `/api/analyze` | Flujo compatible que interpreta y persiste una transacción |
| GET | `/api/transactions` | Historial paginado y filtrable |
| GET | `/api/transactions/summary` | Totales agregados por moneda, tipo y categoría |
| POST | `/api/transactions` | Crear una transacción validada |
| DELETE | `/api/transactions/:id` | Eliminar una transacción propia |
| GET | `/api/export/csv` | Exportar el historial como CSV |

Los errores de IA usan respuestas estructuradas y mensajes seguros:

- `AI_MODEL_ERROR` → HTTP 502.
- `AI_RESPONSE_PARSE_ERROR` → HTTP 502.
- `AI_TIMEOUT` → HTTP 504.

Los logs del Worker registran únicamente códigos técnicos; no registran texto del usuario, tokens ni cookies.

## Desarrollo local

Requisitos: Node.js 18+, npm y una cuenta de Cloudflare para probar bindings remotos.

```bash
git clone https://github.com/RaulHerrera09/cf_ai_cloudfinance.git
cd cf_ai_cloudfinance/apps/backend
npm install
npm run dev
```

En otra terminal:

```bash
cd cf_ai_cloudfinance/apps/frontend
npm install
npm run dev
```

El frontend usa `VITE_API_URL` para seleccionar la API. Para una prueba aislada del frontend se puede activar `VITE_USE_MOCKS=true`, que utiliza fixtures locales y no toca producción.

## Scripts disponibles

Frontend (`apps/frontend`):

- `npm run dev` — servidor Vite de desarrollo.
- `npm run build` — typecheck incremental y build de producción.
- `npm run lint` — ESLint.
- `npm test` — 11 pruebas automatizadas.
- `npm run preview` — servir el build local.

Backend (`apps/backend`):

- `npm run dev` — `wrangler dev`.
- `npm run deploy` — desplegar el Worker con minificación.
- `npm run cf-typegen` — generar tipos de bindings con Wrangler.

Para publicar Pages después de construir el frontend:

```bash
npx wrangler pages deploy dist --project-name cloudfinance-ai
```

## Pruebas cubiertas

La suite actual contiene 11 pruebas automatizadas para:

- Preview válido sin persistencia.
- Fallo de binding/modelo y respuesta no parseable.
- Timeout y errores estructurados sin filtrar detalles del proveedor.
- Confirmación única y reintentos sin duplicación.
- Cancelación de borrado sin petición destructiva.
- Filtros, paginación y exportación CSV.
- Separación entre ingresos y gastos.
- Más de 100 transacciones y monedas separadas.

La confirmación destructiva se valida con fixtures locales para no contaminar datos reales. No se presentan esas pruebas como validaciones sobre dispositivos físicos.

## Estructura

```text
cf_ai_cloudfinance/
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── routes/          # auth, transactions, export
│   │   │   ├── middleware/      # autenticación JWT
│   │   │   ├── utils/           # IA, validación y criptografía Web Crypto
│   │   │   └── db/migrations/   # migraciones D1
│   │   └── wrangler.toml
│   └── frontend/
│       ├── src/
│       │   ├── components/      # auth, dashboard y ledger
│       │   ├── pages/           # login, registro y dashboard
│       │   ├── lib/             # API, finanzas, filtros y guards
│       │   ├── mocks/           # fixtures locales
│       │   └── store/           # estado de autenticación
│       └── public/              # favicon y redirects de Pages
├── data/
├── specs/
├── DEVELOPMENT.md
└── HANDOFF.md
```
