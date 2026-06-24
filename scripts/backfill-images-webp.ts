/**
 * backfill-images-webp.ts
 *
 * Converts existing /uploads/ images (jpg, png, jpeg, gif) to WebP format,
 * renames them to the new slug-timestamp convention, and updates DB records.
 *
 * Usage:
 *   npx tsx scripts/backfill-images-webp.ts [options]
 *
 * Options:
 *   --dry-run          Preview what will happen — no files written, no DB updates
 *   --stats            Show counts only (how many need conversion), then exit
 *   --limit=N          Process at most N records per entity type (use for testing)
 *   --type=hero        Only convert hero slides
 *   --type=category    Only convert category images
 *   --type=product     Only convert product images (MediaAsset)
 *   --type=all         Convert everything (default)
 *   --delete-old       Delete the original file after successful conversion
 *                      (default: keep old file on disk)
 *
 * Examples:
 *   # Dry-run first to see what will change
 *   npx tsx scripts/backfill-images-webp.ts --dry-run
 *
 *   # Test on 2 hero slides only
 *   npx tsx scripts/backfill-images-webp.ts --type=hero --limit=2
 *
 *   # Test on 1 product + 1 category
 *   npx tsx scripts/backfill-images-webp.ts --type=product --limit=1
 *   npx tsx scripts/backfill-images-webp.ts --type=category --limit=1
 *
 *   # Run everything (after testing is successful)
 *   npx tsx scripts/backfill-images-webp.ts --delete-old
 */

import "./load-env";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import prisma from "../src/lib/prisma";

// ─── CLI Args ─────────────────────────────────────────────────────────────────
const DRY_RUN   = process.argv.includes("--dry-run");
const STATS_ONLY = process.argv.includes("--stats");
const DELETE_OLD = process.argv.includes("--delete-old");
const LIMIT = (() => {
  const a = process.argv.find(a => a.startsWith("--limit="));
  return a ? parseInt(a.split("=")[1], 10) : Infinity;
})();
const TYPE = (() => {
  const a = process.argv.find(a => a.startsWith("--type="));
  return (a ? a.split("=")[1] : "all") as "hero" | "category" | "product" | "all";
})();

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[àáâãäå]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
}

function isLocalUpload(url: string): boolean {
  return typeof url === "string" && url.startsWith("/uploads/");
}

function needsConversion(url: string): boolean {
  return isLocalUpload(url) && !url.toLowerCase().endsWith(".webp");
}

function fileSizeKB(filePath: string): number {
  try {
    return Math.round(fs.statSync(filePath).size / 1024);
  } catch {
    return 0;
  }
}

// ─── Core Converter ───────────────────────────────────────────────────────────
interface ConvertResult {
  newUrl: string;
  converted: boolean;
  oldSizeKB: number;
  newSizeKB: number;
  error?: string;
}

async function convertToWebP(
  oldUrl: string,
  maxWidth: number,
  label: string
): Promise<ConvertResult> {
  const filename     = path.basename(oldUrl);
  const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
  const slug         = slugify(nameWithoutExt);
  const newFilename  = `${slug}-${Date.now()}.webp`;
  const oldFilePath  = path.join(UPLOADS_DIR, filename);
  const newFilePath  = path.join(UPLOADS_DIR, newFilename);
  const newUrl       = `/uploads/${newFilename}`;

  if (!fs.existsSync(oldFilePath)) {
    console.log(`  ⚠  File not found on disk — skipping: ${filename}`);
    return { newUrl: oldUrl, converted: false, oldSizeKB: 0, newSizeKB: 0, error: "file not found" };
  }

  const oldSizeKB = fileSizeKB(oldFilePath);
  console.log(`  🔄 ${label}`);
  console.log(`     ${filename} (${oldSizeKB}KB) → ${newFilename} [max ${maxWidth}px, q80]`);

  if (DRY_RUN || STATS_ONLY) {
    return { newUrl, converted: false, oldSizeKB, newSizeKB: 0 };
  }

  await sharp(oldFilePath)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(newFilePath);

  const newSizeKB = fileSizeKB(newFilePath);
  const saved = oldSizeKB - newSizeKB;
  console.log(`     ✅ Done — ${oldSizeKB}KB → ${newSizeKB}KB (saved ${saved}KB, ${Math.round((saved / oldSizeKB) * 100)}%)`);

  if (DELETE_OLD && fs.existsSync(oldFilePath)) {
    fs.unlinkSync(oldFilePath);
    console.log(`     🗑  Old file deleted: ${filename}`);
  } else if (!DELETE_OLD) {
    console.log(`     📁 Old file kept: ${filename} (pass --delete-old to remove)`);
  }

  return { newUrl, converted: true, oldSizeKB, newSizeKB };
}

// ─── Entity Backfills ─────────────────────────────────────────────────────────
interface Summary { total: number; converted: number; skipped: number; errors: number; savedKB: number }

async function backfillHeroSlides(): Promise<Summary> {
  const slides = await prisma.heroSlide.findMany();
  const toConvert = slides.filter(s => needsConversion(s.image)).slice(0, LIMIT);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`🖼  HERO SLIDES — ${toConvert.length} need conversion (${slides.length} total)`);
  console.log(`${"─".repeat(60)}`);

  let converted = 0, skipped = 0, errors = 0, savedKB = 0;

  for (const slide of toConvert) {
    const result = await convertToWebP(slide.image, 1920, `HeroSlide id=${slide.id}`);
    if (result.error) { errors++; continue; }
    if (!result.converted && !DRY_RUN) { skipped++; continue; }

    savedKB += result.oldSizeKB - result.newSizeKB;

    if (result.converted) {
      await prisma.heroSlide.update({ where: { id: slide.id }, data: { image: result.newUrl } });
      console.log(`     💾 DB updated`);
      converted++;
    } else {
      console.log(`     [dry-run] Would update DB: ${result.newUrl}`);
    }
  }

  return { total: toConvert.length, converted, skipped, errors, savedKB };
}

async function backfillCategories(): Promise<Summary> {
  const cats = await prisma.category.findMany({ where: { image: { not: null } } });
  const toConvert = cats.filter(c => c.image && needsConversion(c.image)).slice(0, LIMIT);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`📂 CATEGORIES — ${toConvert.length} need conversion (${cats.length} have images)`);
  console.log(`${"─".repeat(60)}`);

  let converted = 0, skipped = 0, errors = 0, savedKB = 0;

  for (const cat of toConvert) {
    if (!cat.image) continue;
    const result = await convertToWebP(cat.image, 800, `Category "${cat.name}"`);
    if (result.error) { errors++; continue; }

    savedKB += result.oldSizeKB - result.newSizeKB;

    if (result.converted) {
      await prisma.category.update({ where: { id: cat.id }, data: { image: result.newUrl } });
      console.log(`     💾 DB updated`);
      converted++;
    } else {
      console.log(`     [dry-run] Would update DB: ${result.newUrl}`);
    }
  }

  return { total: toConvert.length, converted, skipped, errors, savedKB };
}

async function backfillMediaAssets(): Promise<Summary> {
  const assets = await prisma.mediaAsset.findMany({
    include: { product: { select: { name: true } } },
  });
  const toConvert = assets.filter(a => needsConversion(a.url)).slice(0, LIMIT);

  console.log(`\n${"─".repeat(60)}`);
  console.log(`🛍  PRODUCT IMAGES — ${toConvert.length} need conversion (${assets.length} total)`);
  console.log(`${"─".repeat(60)}`);

  let converted = 0, skipped = 0, errors = 0, savedKB = 0;

  for (const asset of toConvert) {
    const productName = (asset as any).product?.name || asset.productId;
    const result = await convertToWebP(asset.url, 800, `Product "${productName}" — asset ${asset.id}`);
    if (result.error) { errors++; continue; }

    savedKB += result.oldSizeKB - result.newSizeKB;

    if (result.converted) {
      await prisma.mediaAsset.update({ where: { id: asset.id }, data: { url: result.newUrl } });
      console.log(`     💾 DB updated`);
      converted++;
    } else {
      console.log(`     [dry-run] Would update DB: ${result.newUrl}`);
    }
  }

  return { total: toConvert.length, converted, skipped, errors, savedKB };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  Image WebP Backfill`);
  console.log(`  Mode    : ${DRY_RUN ? "DRY RUN (no changes)" : STATS_ONLY ? "STATS ONLY" : "LIVE"}`);
  console.log(`  Type    : ${TYPE}`);
  console.log(`  Limit   : ${LIMIT === Infinity ? "none" : LIMIT} per entity`);
  console.log(`  Old files: ${DELETE_OLD ? "delete after conversion" : "keep on disk"}`);
  console.log(`${"═".repeat(60)}`);

  const results: Record<string, Summary> = {};

  if (TYPE === "hero" || TYPE === "all") {
    results.hero = await backfillHeroSlides();
  }
  if (TYPE === "category" || TYPE === "all") {
    results.category = await backfillCategories();
  }
  if (TYPE === "product" || TYPE === "all") {
    results.product = await backfillMediaAssets();
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  SUMMARY`);
  console.log(`${"═".repeat(60)}`);

  let totalConverted = 0, totalErrors = 0, totalSavedKB = 0, totalRecords = 0;
  for (const [key, r] of Object.entries(results)) {
    console.log(`  ${key.padEnd(12)} — ${r.total} records | converted: ${r.converted} | errors: ${r.errors} | saved: ${r.savedKB}KB`);
    totalConverted += r.converted;
    totalErrors    += r.errors;
    totalSavedKB   += r.savedKB;
    totalRecords   += r.total;
  }

  console.log(`${"─".repeat(60)}`);
  console.log(`  Total      — ${totalRecords} records | converted: ${totalConverted} | errors: ${totalErrors} | saved: ${totalSavedKB}KB (~${(totalSavedKB / 1024).toFixed(1)}MB)`);

  if (DRY_RUN) {
    console.log(`\n  ℹ  Dry-run complete. Re-run without --dry-run to apply.`);
  }
  if (STATS_ONLY) {
    console.log(`\n  ℹ  Stats-only complete. Use --dry-run or remove flag to convert.`);
  }

  console.log(`${"═".repeat(60)}\n`);
}

main()
  .catch(err => {
    console.error("\n❌ Fatal error:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
