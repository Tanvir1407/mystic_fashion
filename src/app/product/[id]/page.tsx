import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { notFound } from 'next/navigation';
import ProductClient from './ProductClient';

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter });

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id }
  });

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="container mx-auto flex-1 w-full py-12">
        <ProductClient product={product} />
      </main>
      <footer className="w-full bg-foreground text-background py-8 border-t-4 border-gold text-center">
        <p className="text-background/60 font-medium text-sm">&copy; {new Date().getFullYear()} Mystic Fashion. All rights reserved.</p>
      </footer>
    </div>
  );
}
