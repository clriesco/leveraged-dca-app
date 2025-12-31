# Cron Jobs Configuration

This document describes how to configure the scheduled jobs (cron) for the Leveraged DCA App.

## Overview

The application requires three daily cron jobs to run automatically:

1. **Price Ingestion** - Fetches daily asset prices from Yahoo Finance
2. **Metrics Refresh** - Recalculates portfolio metrics (equity, exposure, leverage)
3. **Daily Check** - Generates recommendations and alerts

## Scripts Location

All scripts are located in `infra/scripts/`:

- `price-ingestion.ts` - Daily price ingestion
- `metrics-refresh.ts` - Metrics recalculation
- `daily-check.ts` - Daily portfolio verification

## Recommended Schedule

### Production Schedule (UTC)

```
0 6 * * *   # 6:00 AM UTC - Price Ingestion
0 7 * * *   # 7:00 AM UTC - Metrics Refresh (after prices)
0 9 * * *   # 9:00 AM UTC - Daily Check (after metrics)
```

### Development Schedule

For development, you can run them more frequently or manually:

```bash
cd infra/scripts
npm run prices:ingest
npm run metrics:refresh
npm run daily:check
```

## Configuration: GitHub Actions (Current Implementation)

The application uses GitHub Actions to run scheduled jobs. This approach is free and keeps the Render.com service awake.

### Setup

Two workflows are configured:

1. **Keep Alive** (`.github/workflows/keep-alive.yml`) - Pings `/api/health` every 10 minutes to prevent Render.com from sleeping
2. **Daily Jobs** (`.github/workflows/daily-jobs.yml`) - Runs the three scheduled jobs at their designated times

### Required GitHub Secrets

Configure the following secrets in your GitHub repository settings:

1. **`BACKEND_URL`** - The full URL of your backend service (e.g., `https://your-app.onrender.com`)
2. **`DATABASE_URL`** - PostgreSQL connection string for your database

To add secrets:
1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its value

### Keep Alive Workflow

The keep-alive workflow runs every 10 minutes and pings the `/api/health` endpoint to prevent Render.com from putting the service to sleep (important for free tier).

**Schedule:** Every 10 minutes (`*/10 * * * *`)

**Manual trigger:** Available via GitHub Actions UI

### Daily Jobs Workflow

The daily jobs workflow runs all three update scripts every 30 minutes in sequence:

1. **Price Ingestion** - Fetches latest prices from Yahoo Finance
2. **Metrics Refresh** - Recalculates portfolio metrics (runs after price ingestion)
3. **Daily Check** - Generates recommendations and alerts (runs after metrics refresh)

**Schedule:** Every 30 minutes (`*/30 * * * *`)

**Execution order:** Jobs run sequentially (price-ingestion → metrics-refresh → daily-check) to ensure data consistency.

**Manual trigger:** Available via GitHub Actions UI with job selection:
- `all` - Run all three jobs in sequence
- `prices` - Run only price ingestion
- `metrics` - Run only metrics refresh
- `daily-check` - Run only daily check

### Workflow Files

- `.github/workflows/keep-alive.yml` - Health check ping
- `.github/workflows/daily-jobs.yml` - Scheduled daily jobs

### Alternative Options (Not Currently Used)

<details>
<summary>Click to expand alternative configuration options</summary>

#### Option 1: Supabase Cron Jobs

Supabase supports PostgreSQL cron jobs via the `pg_cron` extension.

#### Option 2: Render Cron Jobs

If your backend is hosted on Render, you can use Render's built-in cron jobs feature (requires paid plan).

#### Option 3: Railway Cron Jobs

If using Railway, you can create a separate service for cron jobs.

#### Option 4: External Cron Service

Use services like:
- **Cron-job.org** - Free web-based cron service
- **EasyCron** - Reliable cron service

</details>

## Environment Variables

All scripts require the following environment variables:

```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.uuxvjxdayeovhbduxmbu.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.uuxvjxdayeovhbduxmbu.supabase.co:5432/postgres
```

Make sure these are set in your cron job environment.

## Testing

Before deploying to production, test each script manually:

```bash
# Test price ingestion
cd infra/scripts
npm run prices:ingest

# Test metrics refresh
npm run metrics:refresh

# Test daily check
npm run daily:check
```

## Monitoring

### Logs

Each script logs to console. Monitor logs to ensure jobs are running successfully:

- Check for errors in script output
- Verify data is being written to database
- Monitor execution time

### Alerts

Consider setting up alerts for:
- Script failures
- Missing price data
- Portfolio metrics not updating

## Troubleshooting

### Scripts not running

1. Check cron job configuration
2. Verify environment variables are set
3. Check script permissions
4. Review logs for errors

### Missing price data

1. Verify Yahoo Finance API is accessible
2. Check rate limiting
3. Review asset symbols are valid

### Metrics not updating

1. Ensure price ingestion completed successfully
2. Check database connectivity
3. Verify portfolio positions exist

## Next Steps

1. ✅ Configure GitHub secrets (`BACKEND_URL` and `DATABASE_URL`)
2. ✅ Verify workflows are enabled in GitHub Actions
3. Test each job manually using workflow_dispatch
4. Monitor logs in GitHub Actions for the first few days
5. Set up alerts for workflow failures (GitHub notifications)

## Monitoring

### GitHub Actions

Monitor job execution in:
- **Actions** tab in your GitHub repository
- Check workflow runs for success/failure
- Review logs for each job execution

### Health Check

The keep-alive workflow will log:
- ✅ Success: Health check successful (HTTP 200)
- ⚠️ Warning: Health check returned non-200 status
- ❌ Error: Connection failed

---

**Last updated:** January 2025  
**Status:** ✅ Configured with GitHub Actions



