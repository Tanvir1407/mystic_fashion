# Cron Scheduler Setup

## Overview

Uses `node-cron` to run daily commission recalculation at midnight. Initialized via Next.js Instrumentation (`instrumentation.ts`) — runs exactly once at server startup, preventing memory leaks.

## Files

### 1. `src/lib/cron-scheduler.ts` — Scheduler Wrapper

```ts
import cron from "node-cron";
import { processDailyCommissions } from "./cron";

let task: cron.ScheduledTask | null = null;

export function initCronScheduler() {
  if (task) return;

  task = cron.schedule("0 0 * * *", async () => {
    console.log("[Cron] Running daily commission recalculation...");
    const result = await processDailyCommissions();
    console.log(`[Cron] Completed — ${result.processed} staff processed`);
  });

  console.log("[Cron] Daily midnight scheduler registered");
}
```

### 2. `src/instrumentation.ts` — Next.js Hook (runs once on server start)

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initCronScheduler } = await import("./src/lib/cron-scheduler");
    initCronScheduler();
  }
}
```

## How It Works

| Step | What happens |
|------|-------------|
| 1 | Next.js starts the Node.js server |
| 2 | Calls `register()` in `instrumentation.ts` |
| 3 | Checks `NEXT_RUNTIME === "nodejs"` (skips edge runtime) |
| 4 | Imports and calls `initCronScheduler()` |
| 5 | `node-cron` registers the daily midnight task |
| 6 | Every day at 00:00, `processDailyCommissions()` runs |

## Verification

- Run `npm run dev` or `npm run build && npm run start`
- Terminal log: `[Cron] Daily midnight scheduler registered`
- At midnight: `[Cron] Running daily commission recalculation...`

## Notes

- Only one instance of the cron task exists because `instrumentation.ts` runs once
- `NEXT_RUNTIME` guard prevents errors in serverless/edge environments
- `node-cron@4.2.1` is already in `package.json`
