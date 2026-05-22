import './load-env';
import prisma from '../src/lib/prisma';
import { slugify } from '../src/utils/slugify';

async function main() {
  console.log('--- Starting Product Slugs Migration ---');

  // 1. Fetch all products
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${products.length} products total in the database.`);

  // 2. Identify products with and without slugs
  const productsToMigrate = products.filter(p => !p.slug || p.slug.trim() === '');
  const existingSlugs = new Set<string>(
    products.map(p => p.slug).filter((s): s is string => !!s && s.trim() !== '')
  );

  console.log(`Products already having slugs: ${existingSlugs.size}`);
  console.log(`Products needing slug migration: ${productsToMigrate.length}`);

  if (productsToMigrate.length === 0) {
    console.log('No products require migration. All set!');
    return;
  }

  let migratedCount = 0;

  // 3. Migrate each product
  for (const product of productsToMigrate) {
    let baseSlug = slugify(product.name);
    
    // Fallback if name is empty or slugifies to nothing
    if (!baseSlug) {
      baseSlug = 'product-' + product.id.slice(0, 8);
    }

    let uniqueSlug = baseSlug;
    let counter = 1;

    // Resolve duplicate slugs by appending a numeric suffix
    while (existingSlugs.has(uniqueSlug)) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Add to the local set of allocated slugs to prevent duplicate allocation in this run
    existingSlugs.add(uniqueSlug);

    console.log(`Migrating product "${product.name}":`);
    console.log(`  ID:   ${product.id}`);
    console.log(`  Slug: ${uniqueSlug}`);

    // 4. Update the database record
    await prisma.product.update({
      where: { id: product.id },
      data: { slug: uniqueSlug }
    });

    migratedCount++;
  }

  console.log(`\n--- Migration Completed! Migrated ${migratedCount} products successfully. ---`);
}

main()
  .catch(e => {
    console.error('Error during migration:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
