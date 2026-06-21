import './load-env';
import prisma from '../src/lib/prisma';
import { normalizePhone } from '../src/lib/utils';

async function main() {
  console.log('--- Starting Customer Profile Backfill ---');

  // 1. Fetch all orders
  const orders = await prisma.order.findMany({
    select: {
      id: true,
      customerName: true,
      phone: true,
      address: true,
      totalAmount: true,
      customerId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc', // oldest first, so newer orders override name/address if we iterate chronologically
    },
  });

  console.log(`Found ${orders.length} total orders to process.`);

  // Group orders by clean phone number
  const phoneToOrders: Record<string, typeof orders> = {};
  for (const order of orders) {
    const rawPhone = order.phone?.trim();
    if (!rawPhone) {
      console.warn(`Warning: Order ${order.id} has no phone number. Skipping.`);
      continue;
    }
    const cleanPhone = normalizePhone(rawPhone);
    if (!phoneToOrders[cleanPhone]) {
      phoneToOrders[cleanPhone] = [];
    }
    phoneToOrders[cleanPhone].push(order);
  }

  const uniquePhones = Object.keys(phoneToOrders);
  console.log(`Grouped orders into ${uniquePhones.length} unique customers based on phone number.`);

  let createdCount = 0;
  let updatedCount = 0;
  let linkedOrdersCount = 0;

  // Process each customer
  for (const phone of uniquePhones) {
    const customerOrders = phoneToOrders[phone];
    // Find the latest valid name and address
    let name = '';
    let address = '';

    // Since we sorted orders by createdAt asc, the last order in the array has the most recent details.
    // Let's iterate backwards to find the first non-empty name/address.
    for (let i = customerOrders.length - 1; i >= 0; i--) {
      if (!name && customerOrders[i].customerName?.trim()) {
        name = customerOrders[i].customerName.trim();
      }
      if (!address && customerOrders[i].address?.trim()) {
        address = customerOrders[i].address.trim();
      }
    }

    if (!name) {
      name = `Customer ${phone}`;
    }

    // Upsert Customer profile
    // Note: Since db push has been executed, Customer model is fully available.
    // We check if it exists first or upsert directly.
    const existingCustomer = await prisma.customer.findUnique({
      where: { phone },
    });

    let customer;
    if (existingCustomer) {
      customer = await prisma.customer.update({
        where: { phone },
        data: {
          name,
          address: address || null,
        },
      });
      updatedCount++;
    } else {
      customer = await prisma.customer.create({
        data: {
          phone,
          name,
          address: address || null,
        },
      });
      createdCount++;
    }

    // Update all matching orders that don't have the customerId set yet
    const ordersToUpdate = customerOrders.filter(o => o.customerId !== customer.id);
    if (ordersToUpdate.length > 0) {
      const updateResult = await prisma.order.updateMany({
        where: {
          id: {
            in: ordersToUpdate.map(o => o.id),
          },
        },
        data: {
          customerId: customer.id,
        },
      });
      linkedOrdersCount += updateResult.count;
    }
  }

  console.log(`\nBackfill Results:`);
  console.log(`- Created ${createdCount} new Customer profiles`);
  console.log(`- Updated ${updatedCount} existing Customer profiles`);
  console.log(`- Linked ${linkedOrdersCount} orders to their Customer profiles`);

  // --- Verification ---
  console.log('\n--- Verifying Data Integrity ---');

  // Verify total number of orders
  const postOrders = await prisma.order.findMany({
    select: {
      id: true,
      totalAmount: true,
      customerId: true,
      phone: true,
    },
  });

  const unlinkedOrders = postOrders.filter(o => o.phone && !o.customerId);
  if (unlinkedOrders.length > 0) {
    console.error(`ERROR: ${unlinkedOrders.length} orders with phone numbers are still unlinked!`);
  } else {
    console.log(`SUCCESS: All orders with phone numbers successfully linked.`);
  }

  const initialRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const finalRevenue = postOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  console.log(`- Total orders count: ${orders.length} (Before) vs ${postOrders.length} (After)`);
  console.log(`- Total revenue: BDT ${initialRevenue.toFixed(2)} (Before) vs BDT ${finalRevenue.toFixed(2)} (After)`);

  if (orders.length === postOrders.length && Math.abs(initialRevenue - finalRevenue) < 0.01) {
    console.log('SUCCESS: Data integrity verified. Orders and Revenue are 100% matched!');
  } else {
    console.error('ERROR: Data mismatch detected! Please inspect database state.');
  }
}

main()
  .catch(e => {
    console.error('Error running customer backfill script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
