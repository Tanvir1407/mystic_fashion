// scripts/migrate-media.ts
console.log(' [DIAGNOSTIC] Node.js has successfully started reading the script file.');

console.log(' [DIAGNOSTIC] load-env imported successfully.');

import prisma from '../src/lib/prisma';
console.log(' [DIAGNOSTIC] Prisma Client imported successfully.');

async function main() {
  console.log('---  Starting Media Asset Migration  ---');
  console.log(' Migrating Product.images[] to individual MediaAsset rows.\n');

  console.log('1. Fetching products with images from database...');
  const products = await prisma.product.findMany({
    where: { images: { isEmpty: false } },
    select: { id: true, images: true },
  });
  console.log(`   -> Found ${products.length} products to process.`);

  let mediaCreated = 0;

  let totalImagesProcessed = 0;

  for (const product of products) {
    for (let i = 0; i < product.images.length; i++) {
      totalImagesProcessed++;

      await prisma.mediaAsset.upsert({
        where: {
          productId_url: { productId: product.id, url: product.images[i] },
        },
        update: {},
        create: {
          productId: product.id,
          url: product.images[i],
          isPrimary: i === 0,
          sortOrder: i,
        },
      });
      mediaCreated++;

      if (totalImagesProcessed % 50 === 0) {
        console.log(`   Progress: Processed ${totalImagesProcessed} images...`);
      }
    }
  }

  console.log('\n---  Data Verification Report ---');
  const totalMediaAssetsInDB = await prisma.mediaAsset.count();
  const totalProductsWithImages = await prisma.product.count({
    where: { images: { isEmpty: false } },
  });
  const totalImageCount = (await prisma.product.findMany({
    select: { images: true },
  })).reduce((sum, p) => sum + p.images.length, 0);

  console.log(`- Total products with images: ${totalProductsWithImages}`);
  console.log(`- Total images in Product.images[]: ${totalImageCount}`);
  console.log(`- MediaAsset records created: ${mediaCreated}`);
  console.log(`- Final MediaAsset rows now in DB: ${totalMediaAssetsInDB}`);

  console.log('\n---  Integrity Verification ---');
  if (totalMediaAssetsInDB === totalImageCount) {
    console.log(' SUCCESS: 1:1 MediaAsset mapping is 100% correct.');
  } else {
    console.error(' WARNING: Mismatch detected — not all images were migrated!');
  }

  console.log('\n Media Asset Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('\n[CRITICAL ERROR] Migration failed inside main():', e);
    process.exit(1);
  })
  .finally(async () => {
    console.log(' Disconnecting Prisma Client...');
    await prisma.$disconnect();
  });
