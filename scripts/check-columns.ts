import "./load-env";
import prisma from "../src/lib/prisma";

async function main() {
  const columns: any = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'Category';
  `;
  console.log("Category columns:");
  console.log(columns);
}

main().catch(console.error).finally(() => prisma.$disconnect());
