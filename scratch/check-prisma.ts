import { prisma } from "../src/lib/prisma";

async function check() {
  console.log("Prisma keys:", Object.keys(prisma));
  process.exit(0);
}

check();
