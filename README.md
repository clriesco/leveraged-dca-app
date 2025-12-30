# Leveraged DCA App

Monorepo hosting the NestJS backend, Next.js frontend, shared libraries, and job scripts for the Leveraged DCA product.

## 🎯 Current status — Iteration 2 Strategy Implementation

- ✅ Passwordless authentication backed by Supabase
- ✅ Prisma database schema covering users, portfolios, assets, prices, and metrics
- ✅ NestJS backend with auth endpoints (`/api/auth/login`, `/api/auth/me`)
- ✅ Next.js frontend with login flow and dashboard
- ✅ Scheduled job templates for price ingestion and metrics refresh
- ✅ **Portfolio Configuration Panel** - Customize strategy parameters
- ✅ **Recommendations Engine** - Actionable alerts based on leverage status
- ✅ **Daily Check Job** - Automated portfolio verification with alerts

## Structure

- `apps/backend`: NestJS API handling authentication, portfolios, rebalances, and metrics.
- `apps/frontend`: Next.js dashboard with Supabase-powered passwordless login and visualizations.
- `packages/shared`: Shared typings, constants, and helpers for financial logic.
- `infra/scripts`: Scheduled jobs (`price-ingestion.ts`, `metrics-refresh.ts`) ready for cron deployment.

## Commands

Install dependencies for the entire workspace:

```bash
npm install
```

Run only backend or frontend:

```bash
npm run dev:backend
npm run dev:frontend
```

Run both in parallel (`concurrently` is required):

```bash
npm run dev
```

Lint, test, and build all workspaces:

```bash
npm run lint
npm run test
npm run build
```

## Setup

1. **Environment variables**

   - Backend (`apps/backend/.env`):

     ```bash
     DATABASE_URL=postgresql://postgres:[PASSWORD]@db.uuxvjxdayeovhbduxmbu.supabase.co:5432/postgres
     SUPABASE_URL=https://uuxvjxdayeovhbduxmbu.supabase.co
     SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
     SUPABASE_ANON_KEY=<anon-key>
     FRONTEND_URL=http://localhost:3002
     PORT=3003
     ```

   - Frontend (`apps/frontend/.env.local`):

     ```bash
     NEXT_PUBLIC_SUPABASE_URL=https://uuxvjxdayeovhbduxmbu.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
     NEXT_PUBLIC_API_URL=http://localhost:3003/api
     ```

2. **Sync Prisma schema / inspect database**

   ```bash
   cd apps/backend
   npm run prisma:push
   npm run prisma:studio
   ```

3. **Start local development**

   ```bash
   npm run dev
   ```

## Platform integration

- **Render**: Hosts backend and cron jobs (Docker services).
- **Vercel**: Deploys the Next.js frontend (connect `github.com/clriesco/leveraged-dca-app`).
- **Supabase**: Primary Postgres database and auth provider (`db.uuxvjxdayeovhbduxmbu.supabase.co`).

## Cron jobs

- `infra/scripts/price-ingestion.ts`: Fetches daily asset prices from Yahoo Finance and upserts into `asset_prices`.
- `infra/scripts/metrics-refresh.ts`: Recalculates metrics per portfolio and writes to `metrics_timeseries`.
- `infra/scripts/daily-check.ts`: **NEW** - Daily portfolio verification:
  - Checks leverage status (low/in_range/high)
  - Detects contribution days
  - Generates alerts for action required
  - Stores daily metrics with margin ratio
  - Placeholder for email notifications

Run manually:
```bash
cd infra/scripts
npm run daily:check
```

Schedule via Supabase cron, Render & Railway schedulers, or cloud cron/Edge Function.

## New Features (Iteration 2)

### Configuration Panel (`/dashboard/configuration`)
- Monthly contribution settings (amount, day, enabled)
- Leverage range (min, max, target)
- Deploy signal thresholds (drawdown, weight deviation, volatility)
- Sharpe optimization parameters
- Target weights per asset (with visual editor)
- Margin safety levels

### Recommendations Panel (`/dashboard/recommendations`)
- **Case 1 (In Range)**: Portfolio healthy, no action needed
- **Case 2 (Leverage Low)**: Specific purchase recommendations for reborrow
- **Case 3 (Leverage High)**: Exact extra contribution amount to reduce risk
- Deploy signals visualization (drawdown, weight deviation, volatility)
- Contribution day reminders

### API Endpoints
- `GET/PUT /api/portfolios/:id/configuration` - Portfolio settings
- `GET /api/portfolios/:id/recommendations` - Actionable recommendations

See `ENDPOINTS.md` for full API documentation.

## Next steps (Iteration 3)

- [ ] Email notifications for urgent alerts
- [ ] Webhook integration for Quantfury/broker APIs
- [ ] Historical recommendations tracking
- [ ] Performance analytics dashboard
- [ ] Mobile-responsive improvements

## Testing

- Frontend: http://localhost:3002 (login flow)
- Backend health check: http://localhost:3003/api
- Auth login: `POST http://localhost:3003/api/auth/login` with `{ "email": "you@example.com" }`

## Technical documentation

- Prisma schema: `apps/backend/prisma/schema.prisma`
- Auth flow: Supabase passwordless → magic link → redirect to `/dashboard`
- Scheduled jobs: `infra/scripts/README.md`

