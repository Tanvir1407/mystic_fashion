import "./load-env";
import prisma from "../src/lib/prisma";

const defaultAttributes = [
  { code: "size", name: "Size", type: "TEXT", description: "Standard clothing or footwear sizes (e.g. S, M, L, XL, 41, 42)", presets: ["S", "M", "L", "XL", "XXL", "3XL"] },
  { code: "color", name: "Color", type: "TEXT", description: "Colors, patterns, or shades (e.g. Red, Black, Floral, Shade 102)", presets: ["Black", "White", "Navy", "Red", "Royal Blue", "Maroon", "Grey"] },
  { code: "volume", name: "Volume", type: "TEXT", description: "Liquid volume (e.g. 5ml, 10ml, 50ml, 1L, 2L)", presets: ["5ml", "10ml", "30ml", "50ml", "100ml", "250ml", "500ml", "1L"] },
  { code: "weight", name: "Weight", type: "TEXT", description: "Weight configurations (e.g. 250g, 500g, 1kg, 5kg)", presets: ["250g", "500g", "1kg", "2kg", "5kg"] },
  { code: "dimension", name: "Dimension", type: "TEXT", description: "Dimensional measurements (e.g. 5x7 inches, 6x4 feet, King Size)", presets: ["5x7 inches", "6x4 feet", "King Size"] },
  { code: "ram", name: "RAM", type: "TEXT", description: "Random Access Memory capacity (e.g. 6GB, 8GB, 12GB, 16GB)", presets: ["4GB", "6GB", "8GB", "12GB", "16GB", "32GB"] },
  { code: "storage", name: "Storage", type: "TEXT", description: "Data storage capacity (e.g. 64GB, 128GB, 256GB, 1TB)", presets: ["64GB", "128GB", "256GB", "512GB", "1TB"] },
  { code: "connectivity", name: "Connectivity", type: "TEXT", description: "Wireless connectivity options (e.g. Wi-Fi Only, Wi-Fi + Cellular, 5G)", presets: ["Wi-Fi Only", "Wi-Fi + Cellular", "5G", "4G LTE"] },
  { code: "plug_type", name: "Plug Type", type: "TEXT", description: "Power plug standard (e.g. US Plug, UK Plug, EU Plug)", presets: ["US Plug", "EU Plug", "UK Plug", "Global"] },
  { code: "flavor", name: "Flavor", type: "TEXT", description: "Taste options (e.g. Chocolate, Vanilla, Spicy, BBQ)", presets: ["Chocolate", "Vanilla", "Strawberry", "Mango", "Regular"] },
  { code: "fabric", name: "Fabric", type: "TEXT", description: "Material or fabric type (e.g. Denim, Cotton, Silk, Polyester)", presets: ["Cotton", "Denim", "Silk", "Linen", "Polyester", "Wool"] },
  { code: "fit", name: "Fit", type: "TEXT", description: "Clothing fit styles (e.g. Slim Fit, Regular Fit, Oversized)", presets: ["Slim Fit", "Regular Fit", "Oversized", "Loose Fit"] }
];

async function main() {
  console.log("=== Seeding Attribute Registry ===");
  for (const attr of defaultAttributes) {
    const existing = await prisma.attributeRegistry.findUnique({
      where: { code: attr.code }
    });

    if (!existing) {
      const created = await prisma.attributeRegistry.create({
        data: attr
      });
      console.log(`✅ Created attribute: ${created.name} (${created.code})`);
    } else {
      const updated = await prisma.attributeRegistry.update({
        where: { id: existing.id },
        data: {
          presets: attr.presets
        }
      });
      console.log(`✅ Updated presets for attribute: ${updated.name} (${updated.code})`);
    }
  }
  console.log("=== Seeding Completed successfully ===");
}

main()
  .catch((e) => {
    console.error("Error during attribute seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
