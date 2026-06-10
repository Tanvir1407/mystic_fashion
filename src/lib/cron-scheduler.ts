import cron from "node-cron";
import { processDailyCommissions } from "./cron";

let task: cron.ScheduledTask | null = null;

export function initCronScheduler() {
  if (task) return;

  task = cron.schedule(
    "0 0 * * *",
    async () => {
      console.log("[Cron] Running daily commission recalculation...");
      try {
        const result = await processDailyCommissions();
        console.log(`[Cron] Completed — ${result.processed} staff processed`);
      } catch (error) {
        console.error("[Cron] Error:", error);
      }
    },
    { timezone: "Asia/Dhaka" },
  );

  console.log("[Cron] Daily midnight scheduler registered (Asia/Dhaka)");
}
