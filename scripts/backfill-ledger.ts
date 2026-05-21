import './load-env';
import prisma from '../src/lib/prisma';
import { AccountType, TransactionType } from '../src/generated/prisma/client';

async function main() {
  console.log('--- Starting Double-Entry Ledger Backfill ---');

  // 1. Ensure the Cash & Bank asset account exists
  let cashAccount = await prisma.chartOfAccount.findUnique({
    where: { name: 'Cash & Bank' },
  });

  if (!cashAccount) {
    cashAccount = await prisma.chartOfAccount.create({
      data: {
        name: 'Cash & Bank',
        type: 'ASSET',
        status: 'ACTIVE',
      },
    });
    console.log('Created system account: Cash & Bank (ASSET)');
  } else {
    console.log('Found system account: Cash & Bank');
  }

  // 2. Fetch all legacy Transaction records
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: 'asc' },
  });

  console.log(`Found ${transactions.length} legacy transactions to convert.`);

  let createdCount = 0;
  let skippedCount = 0;

  for (const txRecord of transactions) {
    // To ensure idempotency, check if a JournalEntry already exists with this referenceId/Type
    // or if we have already created one for this specific transaction ID.
    // We can use referenceId = txRecord.referenceId or referenceType = txRecord.referenceType.
    // If those are null, we can check by description and date.
    let existingEntry = null;
    if (txRecord.referenceId && txRecord.referenceType) {
      existingEntry = await prisma.journalEntry.findFirst({
        where: {
          referenceId: txRecord.referenceId,
          referenceType: txRecord.referenceType,
        },
      });
    } else {
      existingEntry = await prisma.journalEntry.findFirst({
        where: {
          description: txRecord.description,
          date: txRecord.date,
        },
      });
    }

    if (existingEntry) {
      skippedCount++;
      continue;
    }

    // Determine the opposite TransactionType for double entry balancing
    const oppositeType = txRecord.type === 'DEBIT' ? 'CREDIT' : 'DEBIT';

    // Create the JournalEntry and the balanced lines in a transaction
    await prisma.$transaction(async (dbTx) => {
      await dbTx.journalEntry.create({
        data: {
          date: txRecord.date,
          description: txRecord.description,
          referenceId: txRecord.referenceId,
          referenceType: txRecord.referenceType,
          lines: {
            create: [
              // Line 1: Original single-entry account side
              {
                accountId: txRecord.accountId,
                amount: txRecord.amount,
                type: txRecord.type,
              },
              // Line 2: Balanced Cash & Bank asset account side
              {
                accountId: cashAccount.id,
                amount: txRecord.amount,
                type: oppositeType,
              },
            ],
          },
        },
      });
    });

    createdCount++;
  }

  console.log(`\nBackfill Results:`);
  console.log(`- Converted ${createdCount} legacy transactions to double-entry JournalEntries`);
  console.log(`- Skipped ${skippedCount} already-converted entries`);

  // --- Verification ---
  console.log('\n--- Verifying Ledger Balance ---');

  const journalEntries = await prisma.journalEntry.findMany({
    include: {
      lines: true,
    },
  });

  let unbalancedCount = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of journalEntries) {
    let entryDebit = 0;
    let entryCredit = 0;

    for (const line of entry.lines) {
      if (line.type === 'DEBIT') {
        entryDebit += line.amount;
        totalDebit += line.amount;
      } else {
        entryCredit += line.amount;
        totalCredit += line.amount;
      }
    }

    // Allow tiny floating point differences
    if (Math.abs(entryDebit - entryCredit) > 0.001) {
      unbalancedCount++;
      console.error(`ERROR: Unbalanced entry found! ID: ${entry.id}, Debit: ${entryDebit}, Credit: ${entryCredit}`);
    }
  }

  console.log(`- Total JournalEntries audited: ${journalEntries.length}`);
  console.log(`- Total Debits across ledger:  BDT ${totalDebit.toFixed(2)}`);
  console.log(`- Total Credits across ledger: BDT ${totalCredit.toFixed(2)}`);

  if (unbalancedCount === 0 && Math.abs(totalDebit - totalCredit) < 0.01) {
    console.log('SUCCESS: All journal entries are perfectly balanced (Debits = Credits)!');
  } else {
    console.error(`ERROR: Detected ${unbalancedCount} unbalanced journal entries!`);
  }
}

main()
  .catch(e => {
    console.error('Error running ledger backfill script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
