import { TransactionType } from "@/generated/prisma/client";

export async function getOrCreateSystemAccount(
  tx: any,
  name: string,
  type: "INCOME" | "EXPENSE"
) {
  let account = await tx.chartOfAccount.findUnique({ where: { name } });
  if (!account) {
    account = await tx.chartOfAccount.create({
      data: { name, type, status: "ACTIVE" },
    });
  }
  return account;
}

export async function createDoubleEntryJournal(
  tx: any,
  data: {
    accountId: string;
    amount: number;
    date: Date;
    type: TransactionType;
    description: string;
    referenceId?: string;
    referenceType?: string;
  }
) {
  // Legacy transaction record — backward-compatibility
  await tx.transaction.create({
    data: {
      accountId: data.accountId,
      amount: data.amount,
      date: data.date,
      type: data.type,
      description: data.description,
      referenceId: data.referenceId || null,
      referenceType: data.referenceType || null,
    },
  });

  let cashAccount = await tx.chartOfAccount.findUnique({
    where: { name: "Cash & Bank" },
  });
  if (!cashAccount) {
    cashAccount = await tx.chartOfAccount.create({
      data: { name: "Cash & Bank", type: "ASSET", status: "ACTIVE" },
    });
  }

  const oppositeType = data.type === "DEBIT" ? "CREDIT" : "DEBIT";
  await tx.journalEntry.create({
    data: {
      date: data.date,
      description: data.description,
      referenceId: data.referenceId || null,
      referenceType: data.referenceType || null,
      lines: {
        create: [
          { accountId: data.accountId, amount: data.amount, type: data.type },
          { accountId: cashAccount.id, amount: data.amount, type: oppositeType },
        ],
      },
    },
  });
}
