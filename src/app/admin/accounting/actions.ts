"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createAccount(data: {
  name: string;
  type: "INCOME" | "EXPENSE" | "ASSET" | "LIABILITY";
  status?: "ACTIVE" | "INACTIVE";
}) {
  try {
    const account = await prisma.chartOfAccount.create({
      data: {
        name: data.name,
        type: data.type,
        status: data.status || "ACTIVE",
      },
    });
    revalidatePath("/admin/accounting");
    return { success: true, account };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAccounts(type?: "INCOME" | "EXPENSE" | "ASSET" | "LIABILITY") {
  return await prisma.chartOfAccount.findMany({
    where: type ? { type } : undefined,
    orderBy: { name: "asc" },
  });
}

export async function storeTransaction(data: {
  accountId: string;
  amount: number;
  date: string | Date;
  description: string;
  referenceId?: string;
  referenceType?: string;
}) {
  try {
    const account = await prisma.chartOfAccount.findUnique({
      where: { id: data.accountId },
    });

    if (!account) throw new Error("Account not found");

    // Rule 1: Income means Credit, Expense means Debit
    let type: "DEBIT" | "CREDIT" = "DEBIT"; // default
    if (account.type === "INCOME" || account.type === "LIABILITY") {
      type = "CREDIT";
    } else if (account.type === "EXPENSE" || account.type === "ASSET") {
      type = "DEBIT";
    }

    // If the selected date is today, inject the current time so it sorts correctly above earlier automated entries today
    let finalDate = new Date(data.date);
    const todayStr = new Date().toISOString().split("T")[0];
    if (typeof data.date === "string" && data.date === todayStr) {
      finalDate = new Date(); // Inject precise real-time
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId: data.accountId,
        amount: data.amount,
        date: finalDate,
        type,
        description: data.description,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
      },
    });

    revalidatePath("/admin/accounting");
    return { success: true, transaction };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getLedger(accountId?: string, filters?: { startDate?: string; endDate?: string }, page: number = 1, limit: number = 20) {
  const where: any = {};
  if (accountId) where.accountId = accountId;
  
  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) where.date.gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { account: true },
      orderBy: [
        { date: "desc" },
        { createdAt: "desc" }
      ],
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where })
  ]);

  return { transactions, total };
}

export async function getFinancialSummary(filters?: { startDate?: string; endDate?: string }) {
  const dateFilter: any = {};
  if (filters?.startDate || filters?.endDate) {
    if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
    if (filters.endDate) {
       const end = new Date(filters.endDate);
       end.setHours(23, 59, 59, 999);
       dateFilter.lte = end;
    }
  }

  // Get all transactions with their accounts
  const transactions = await prisma.transaction.findMany({
    where: Object.keys(dateFilter).length > 0 ? { date: dateFilter } : undefined,
    include: { account: true },
  });

  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    if (t.account.type === "INCOME" && t.type === "CREDIT") {
      totalIncome += t.amount;
    } else if (t.account.type === "INCOME" && t.type === "DEBIT") {
      totalIncome -= t.amount;
    }

    if (t.account.type === "EXPENSE" && t.type === "DEBIT") {
      totalExpense += t.amount;
    } else if (t.account.type === "EXPENSE" && t.type === "CREDIT") {
      totalExpense -= t.amount;
    }
  }

  const netProfit = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    netProfit,
  };
}

export async function deleteAccount(accountId: string) {
  try {
    // Rule 3: Prevent deleting an account if it has existing transactions
    const transactionCount = await prisma.transaction.count({
      where: { accountId },
    });

    if (transactionCount > 0) {
      throw new Error("Cannot delete account because it has existing transactions.");
    }

    await prisma.chartOfAccount.delete({
      where: { id: accountId },
    });

    revalidatePath("/admin/accounting");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTransaction(transactionId: string) {
  try {
    await prisma.transaction.delete({
      where: { id: transactionId },
    });
    revalidatePath("/admin/accounting");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
