import prisma from "../src/lib/prisma";

async function main() {
  const logs = await prisma.activityLog.findMany({
    orderBy: { timestamp: "desc" },
    take: 5
  });
  console.log("RECENT ACTIVITY LOGS:", JSON.stringify(logs, null, 2));
}

main().catch(console.error);
