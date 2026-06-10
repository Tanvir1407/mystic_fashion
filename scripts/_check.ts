import prisma from "../src/lib/prisma";
async function main() {
const cnt = await prisma.dailyStaffCommission.count();
const first = await prisma.dailyStaffCommission.findFirst({ orderBy: { date: "asc" } });
const last = await prisma.dailyStaffCommission.findFirst({ orderBy: { date: "desc" } });
console.log("Records:", cnt);
console.log("First:", first?.date?.toISOString());
console.log("Last:", last?.date?.toISOString());
await prisma.$disconnect();
}
main();
