import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding the database...');

  // Create default staff
  await prisma.staff.upsert({
    where: { email: 'mystic@gmail.com' },
    update: {},
    create: {
      username: 'admin',
      email: 'mystic@gmail.com',
      password: '123456',
    },
  });
  console.log('Default staff member created.');

  // Create products
  const products = [
    {
      name: 'Aurum Factory Home Kit 2026',
      description: 'The official home kit of Aurum FC for the 2026 season. Engineered for champions.',
      price: 12500,
      images: ['/images/hero_jersey_1775987082211.png'],
      sizes: ['S', 'M', 'L', 'XL'],
      team: 'Aurum FC',
      stock: 50,
      category: 'Jerseys',
    },
    {
      name: 'Real Madrid Away Kit',
      description: 'Elegant white and gold away kit, premium feel.',
      price: 13500,
      images: ['/images/trending_jersey_1_1775987099771.png'],
      sizes: ['M', 'L', 'XL'],
      team: 'Real Madrid',
      stock: 100,
      category: 'Jerseys',
    },
    {
      name: 'Argentina Retro 90s',
      description: 'Classic 90s retro style. Relive the glory days.',
      price: 14000,
      images: ['/images/trending_jersey_2_1775987115734.png'],
      sizes: ['S', 'M'],
      team: 'Argentina',
      stock: 20,
      category: 'Jerseys',
    },
    {
      name: 'Onyx Edition Pitch Black',
      description: 'Sleek all-black design with maroon accents for optimal stealth.',
      price: 13000,
      images: ['/images/trending_jersey_3_1775987132054.png'],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      team: 'Custom',
      stock: 75,
      category: 'Jerseys',
    },
    {
      name: 'Aethelred Classic Gold',
      description: 'Vibrant gold with classic pinstripes.',
      price: 11500,
      images: ['/images/trending_jersey_4_1775987153020.png'],
      sizes: ['L', 'XL', 'XXL'],
      team: 'Aethelred',
      stock: 35,
      category: 'Jerseys',
    },
    {
      name: 'Argentina 2024 Home',
      description: 'The official home kit for Argentina.',
      price: 12000,
      images: ['/images/hero_jersey_1775987082211.png'],
      sizes: ['S', 'M', 'L'],
      team: 'Argentina',
      stock: 40,
      category: 'Jerseys',
    },
  ];

  for (const p of products) {
    const { sizes, stock, ...rest } = p;
    await prisma.product.create({
      data: {
        ...rest,
        variants: {
          create: sizes.map(size => ({
            size,
            stock: Math.floor(stock / sizes.length)
          }))
        }
      },
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
