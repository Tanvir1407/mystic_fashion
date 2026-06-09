import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  const slabs = [
    { id: "slab-1", minAmount: 0,     maxAmount: 5000,  rate: 0,   priority: 1 },
    { id: "slab-2", minAmount: 5001,  maxAmount: 10000, rate: 1,   priority: 2 },
    { id: "slab-3", minAmount: 10001, maxAmount: null,  rate: 1.5, priority: 3 },
  ];

  for (const slab of slabs) {
    await prisma.commissionSlab.upsert({
      where: { id: slab.id },
      update: slab,
      create: slab,
    });
  }

  console.log("Seeded 3 Commission Slabs");
}

main()
  .catch((e) => {
    console.error("Error seeding commission slabs:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
