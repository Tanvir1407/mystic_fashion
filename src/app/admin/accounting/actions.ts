"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAuditLog } from "@/lib/audit";
import { TransactionType, AccountType } from "@/src/generated/prisma/client";

// ─── UTILITIES & HELPERS ───────────────────────────────────────────────────

/**
 * Calculate the net running balance of an account based on standard double-entry rules:
 * - ASSETS and EXPENSES: Debit (+) and Credit (-)
 * - LIABILITIES, INCOME, and EQUITY: Credit (+) and Debit (-)
 */
function calculateAccountBalance(type: AccountType, debits: number, credits: number): number {
  if (type === "ASSET" || type === "EXPENSE") {
    return debits - credits;
  }
  return credits - debits;
}

// ─── CREATE ACCOUNT ─────────────────────────────────────────────────────────

async function _createAccount(data: {
  name: string;
  type: "INCOME" | "EXPENSE" | "ASSET" | "LIABILITY";
  status?: "ACTIVE" | "INACTIVE";
}) {
  try {
    const account = await prisma.chartOfAccount.create({
      data: {
        name: data.name.trim(),
        type: data.type,
        status: data.status || "ACTIVE",
      },
    });
    revalidatePath("/admin/accounting");
    return { success: true, account };
  } catch (error: any) {
    console.error("Create account error:", error);
    return { success: false, error: error.message || "Failed to create account." };
  }
}

export const createAccount = withAuditLog(_createAccount, {
  entityType: "ChartOfAccount",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.account?.id ?? null,
  fetchAfter: (id) => prisma.chartOfAccount.findUnique({ where: { id } }),
  describe: (args) => `Created account "${args[0].name}" (${args[0].type})`,
});

// ─── GET ACCOUNTS ───────────────────────────────────────────────────────────

export async function getAccounts(type?: "INCOME" | "EXPENSE" | "ASSET" | "LIABILITY") {
  try {
    const accounts = await prisma.chartOfAccount.findMany({
      where: type ? { type } : undefined,
      include: {
        journalLines: {
          select: { amount: true, type: true }
        }
      },
      orderBy: { name: "asc" },
    });

    return accounts.map(acc => {
      let debits = 0;
      let credits = 0;
      for (const line of acc.journalLines) {
        if (line.type === "DEBIT") debits += line.amount;
        if (line.type === "CREDIT") credits += line.amount;
      }
      const balance = calculateAccountBalance(acc.type, debits, credits);
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        status: acc.status,
        createdAt: acc.createdAt,
        updatedAt: acc.updatedAt,
        balance,
      };
    });
  } catch (error) {
    console.error("Get accounts error:", error);
    return [];
  }
}

// ─── STORE MANUAL TRANSACTION (BALANCED DOUBLE-ENTRY) ───────────────────────

async function _storeTransaction(data: {
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

    // Standard debit-credit mapping based on account types
    let type: TransactionType = "DEBIT";
    if (account.type === "INCOME" || account.type === "LIABILITY") {
      type = "CREDIT";
    } else if (account.type === "EXPENSE" || account.type === "ASSET") {
      type = "DEBIT";
    }

    let finalDate = new Date(data.date);
    const todayStr = new Date().toISOString().split("T")[0];
    if (typeof data.date === "string" && data.date === todayStr) {
      finalDate = new Date();
    }

    // Execute in a single transactional block to guarantee double-entry balance
    const result = await prisma.$transaction(async (tx) => {
      // 1. Log legacy single-side Transaction for 100% backward-compatibility
      const transaction = await tx.transaction.create({
        data: {
          accountId: data.accountId,
          amount: data.amount,
          date: finalDate,
          type,
          description: data.description.trim(),
          referenceId: data.referenceId || null,
          referenceType: data.referenceType || null,
        },
      });

      // 2. Resolve or provision the system Cash & Bank account
      let cashAccount = await tx.chartOfAccount.findUnique({
        where: { name: "Cash & Bank" },
      });
      if (!cashAccount) {
        cashAccount = await tx.chartOfAccount.create({
          data: {
            name: "Cash & Bank",
            type: "ASSET",
            status: "ACTIVE",
          },
        });
      }

      // Determine the opposite double-entry counter side
      const oppositeType = type === "DEBIT" ? "CREDIT" : "DEBIT";

      // 3. Create the balanced parent JournalEntry and two balancing JournalLines
      await tx.journalEntry.create({
        data: {
          date: finalDate,
          description: data.description.trim(),
          referenceId: data.referenceId || null,
          referenceType: data.referenceType || null,
          lines: {
            create: [
              {
                accountId: data.accountId,
                amount: data.amount,
                type,
              },
              {
                accountId: cashAccount.id,
                amount: data.amount,
                type: oppositeType,
              },
            ],
          },
        },
      });

      return transaction;
    });

    revalidatePath("/admin/accounting");
    return { success: true, transaction: result };
  } catch (error: any) {
    console.error("Store transaction error:", error);
    return { success: false, error: error.message || "Failed to save transaction." };
  }
}

export const storeTransaction = withAuditLog(_storeTransaction, {
  entityType: "Transaction",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.transaction?.id ?? null,
  fetchAfter: (id) => prisma.transaction.findUnique({ where: { id }, include: { account: true } }),
  describe: (args) => `Logged transaction: ${args[0].description} (৳${args[0].amount})`,
});

// ─── GET LEDGER ─────────────────────────────────────────────────────────────

export async function getLedger(
  accountId?: string,
  filters?: { startDate?: string; endDate?: string },
  page: number = 1,
  limit: number = 20
) {
  try {
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
  } catch (error) {
    console.error("Get ledger error:", error);
    return { transactions: [], total: 0 };
  }
}

// ─── GET FINANCIAL SUMMARY ─────────────────────────────────────────────────

export async function getFinancialSummary(filters?: { startDate?: string; endDate?: string }) {
  try {
    const dateFilter: any = {};
    if (filters?.startDate || filters?.endDate) {
      if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    const whereClause = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : undefined;

    // Parallel aggregates on double-entry lines is much faster and audit-perfect
    const [incomeResult, expenseResult, arResult, apResult] = await Promise.all([
      prisma.journalLine.groupBy({
        by: ["type"],
        where: {
          journalEntry: whereClause,
          account: { type: "INCOME" },
        },
        _sum: { amount: true },
      }),
      prisma.journalLine.groupBy({
        by: ["type"],
        where: {
          journalEntry: whereClause,
          account: { type: "EXPENSE" },
        },
        _sum: { amount: true },
      }),
      // Accounts Receivable balances (Asset, excluding Bank & Cash systems)
      prisma.journalLine.groupBy({
        by: ["type"],
        where: {
          account: {
            type: "ASSET",
            NOT: {
              OR: [
                { name: "Cash & Bank" },
                { name: { contains: "Cash", mode: "insensitive" } },
                { name: { contains: "bKash", mode: "insensitive" } },
                { name: { contains: "Nagad", mode: "insensitive" } },
                { name: { contains: "Bank", mode: "insensitive" } },
              ]
            }
          }
        },
        _sum: { amount: true },
      }),
      // Accounts Payable balances (Liability)
      prisma.journalLine.groupBy({
        by: ["type"],
        where: {
          account: { type: "LIABILITY" },
        },
        _sum: { amount: true },
      }),
    ]);

    let totalIncome = 0;
    for (const res of incomeResult) {
      if (res.type === "CREDIT") totalIncome += res._sum.amount ?? 0;
      if (res.type === "DEBIT") totalIncome -= res._sum.amount ?? 0;
    }

    let totalExpense = 0;
    for (const res of expenseResult) {
      if (res.type === "DEBIT") totalExpense += res._sum.amount ?? 0;
      if (res.type === "CREDIT") totalExpense -= res._sum.amount ?? 0;
    }

    let totalAR = 0;
    for (const res of arResult) {
      if (res.type === "DEBIT") totalAR += res._sum.amount ?? 0;
      if (res.type === "CREDIT") totalAR -= res._sum.amount ?? 0;
    }

    let totalAP = 0;
    for (const res of apResult) {
      if (res.type === "CREDIT") totalAP += res._sum.amount ?? 0;
      if (res.type === "DEBIT") totalAP -= res._sum.amount ?? 0;
    }

    const netProfit = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netProfit,
      totalAR: Math.max(0, totalAR),
      totalAP: Math.max(0, totalAP),
    };
  } catch (error) {
    console.error("Get financial summary error:", error);
    return { totalIncome: 0, totalExpense: 0, netProfit: 0, totalAR: 0, totalAP: 0 };
  }
}

// ─── COURIER REMITTANCE RECONCILIATION ─────────────────────────────────────

async function _reconcileCourierDues(data: {
  courierAccountId: string;
  receivingAccountId: string;
  amount: number;
  chargeAmount: number;
  description: string;
}) {
  try {
    const [courierAcc, receivingAcc] = await Promise.all([
      prisma.chartOfAccount.findUnique({ where: { id: data.courierAccountId } }),
      prisma.chartOfAccount.findUnique({ where: { id: data.receivingAccountId } }),
    ]);

    if (!courierAcc || !receivingAcc) throw new Error("Accounts not found");

    // Fetch or provision a dedicated Delivery Charge Expense account
    let chargeAcc = await prisma.chartOfAccount.findFirst({
      where: { name: { contains: "Courier Charge", mode: "insensitive" } },
    });
    if (!chargeAcc) {
      chargeAcc = await prisma.chartOfAccount.create({
        data: {
          name: "Courier Delivery Charges",
          type: "EXPENSE",
          status: "ACTIVE",
        },
      });
    }

    const totalCleared = data.amount + data.chargeAmount;
    const finalDate = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create legacy transaction mapping for both debit and credit components
      await tx.transaction.create({
        data: {
          accountId: data.receivingAccountId,
          amount: data.amount,
          date: finalDate,
          type: "DEBIT",
          description: `Courier remittance: ${data.description.trim()}`,
          referenceType: "RECONCILIATION",
        },
      });

      if (data.chargeAmount > 0) {
        await tx.transaction.create({
          data: {
            accountId: chargeAcc.id,
            amount: data.chargeAmount,
            date: finalDate,
            type: "DEBIT",
            description: `Remittance deduction fee: ${data.description.trim()}`,
            referenceType: "RECONCILIATION",
          },
        });
      }

      await tx.transaction.create({
        data: {
          accountId: data.courierAccountId,
          amount: totalCleared,
          date: finalDate,
          type: "CREDIT",
          description: `Cleared receivable via remittance: ${data.description.trim()}`,
          referenceType: "RECONCILIATION",
        },
      });

      // 2. Create the balanced double-entry Journal Entry with 3 balanced ledger lines:
      // - Debit Asset: Receiving account (+amount)
      // - Debit Expense: Delivery Charge (+chargeAmount)
      // - Credit Asset: Courier Account (-totalCleared)
      const journalLines: any[] = [
        {
          accountId: data.receivingAccountId,
          amount: data.amount,
          type: "DEBIT" as TransactionType,
        },
        {
          accountId: data.courierAccountId,
          amount: totalCleared,
          type: "CREDIT" as TransactionType,
        },
      ];

      if (data.chargeAmount > 0) {
        journalLines.push({
          accountId: chargeAcc.id,
          amount: data.chargeAmount,
          type: "DEBIT" as TransactionType,
        });
      }

      const journal = await tx.journalEntry.create({
        data: {
          date: finalDate,
          description: `Courier Remittance Reconciliation: ${data.description.trim()}`,
          referenceType: "RECONCILIATION",
          lines: {
            create: journalLines,
          },
        },
      });

      return journal;
    });

    revalidatePath("/admin/accounting");
    return { success: true, result };
  } catch (error: any) {
    console.error("Courier reconciliation error:", error);
    return { success: false, error: error.message || "Failed to reconcile courier dues." };
  }
}

export const reconcileCourierDues = withAuditLog(_reconcileCourierDues, {
  entityType: "JournalEntry",
  action: "CREATE",
  getEntityId: () => null,
  getEntityIdFromResult: (r: any) => r?.result?.id ?? null,
  fetchAfter: (id) => prisma.journalEntry.findUnique({ where: { id }, include: { lines: true } }),
  describe: (args) => `Reconciled courier dues from account ${args[0].courierAccountId} (Total: ৳${args[0].amount})`,
});

// ─── EXPOSED SUB-LEDGER SERVICES ───────────────────────────────────────────

/**
 * Fetch detailed Sales Journal/Invoices
 */
export async function getSalesJournal(filters?: { startDate?: string; endDate?: string }, page: number = 1, limit: number = 20) {
  try {
    const where: any = {};
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          customerName: true,
          phone: true,
          totalAmount: true,
          discountAmount: true,
          status: true,
          createdAt: true,
        }
      }),
      prisma.order.count({ where }),
    ]);

    const mappedOrders = orders.map(order => ({
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.phone,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      shippingCharge: 0,
      vatAmount: 0,
      status: order.status,
      createdAt: order.createdAt,
    }));

    return { data: mappedOrders, total };
  } catch (error) {
    console.error("Get sales journal error:", error);
    return { data: [], total: 0 };
  }
}

/**
 * Fetch detailed Purchase Ledger (Wholesale stock procurements)
 */
export async function getPurchasesJournal(filters?: { startDate?: string; endDate?: string }, page: number = 1, limit: number = 20) {
  try {
    const where: any = {};
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const skip = (page - 1) * limit;

    const [purchases, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          supplier: {
            select: { name: true, phone: true }
          }
        }
      }),
      prisma.purchase.count({ where }),
    ]);

    return { data: purchases, total };
  } catch (error) {
    console.error("Get purchase journal error:", error);
    return { data: [], total: 0 };
  }
}

/**
 * Fetch running balances for Asset Registers (Bank, Cash, MFS)
 */
export async function getBankCashRegisters() {
  try {
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        type: "ASSET",
        status: "ACTIVE",
      },
      include: {
        journalLines: {
          select: { amount: true, type: true }
        }
      }
    });

    return accounts.map(acc => {
      let debits = 0;
      let credits = 0;
      for (const line of acc.journalLines) {
        if (line.type === "DEBIT") debits += line.amount;
        if (line.type === "CREDIT") credits += line.amount;
      }
      const balance = calculateAccountBalance("ASSET", debits, credits);
      return {
        id: acc.id,
        name: acc.name,
        balance,
      };
    });
  } catch (error) {
    console.error("Get bank cash registers error:", error);
    return [];
  }
}

/**
 * Fetch detailed General Ledger entries chronologically
 */
export async function getGeneralLedger(
  filters?: { startDate?: string; endDate?: string; search?: string },
  page: number = 1,
  limit: number = 20
) {
  try {
    const where: any = {};
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (filters?.search) {
      where.OR = [
        { description: { contains: filters.search, mode: "insensitive" } },
        { referenceId: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: { account: true }
          }
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.journalEntry.count({ where }),
    ]);

    return { data: entries, total };
  } catch (error) {
    console.error("Get general ledger error:", error);
    return { data: [], total: 0 };
  }
}

// ─── DYNAMIC STATEMENT GENERATION ──────────────────────────────────────────

/**
 * Generate Profit & Loss, Balance Sheet, and Trial Balance instantly
 */
export async function getFinancialReports(type: "PL" | "BS" | "TB", filters?: { startDate?: string; endDate?: string }) {
  try {
    const dateFilter: any = {};
    if (filters?.startDate || filters?.endDate) {
      if (filters.startDate) dateFilter.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    const whereClause = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : undefined;

    // Fetch all accounts and their matching journal lines inside the time period
    const accounts = await prisma.chartOfAccount.findMany({
      include: {
        journalLines: {
          where: whereClause ? { journalEntry: whereClause } : undefined,
          select: { amount: true, type: true }
        }
      }
    });

    const formattedAccounts = accounts.map(acc => {
      let debits = 0;
      let credits = 0;
      for (const line of acc.journalLines) {
        if (line.type === "DEBIT") debits += line.amount;
        if (line.type === "CREDIT") credits += line.amount;
      }
      const balance = calculateAccountBalance(acc.type, debits, credits);
      return {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        debits,
        credits,
        balance,
      };
    });

    if (type === "TB") {
      // Trial Balance
      let totalDebits = 0;
      let totalCredits = 0;
      const rows = formattedAccounts.filter(a => a.debits > 0 || a.credits > 0);
      for (const r of rows) {
        // Under Trial Balance, asset/expense accounts have debit balances; others credit
        if (r.type === "ASSET" || r.type === "EXPENSE") {
          totalDebits += r.balance;
        } else {
          totalCredits += r.balance;
        }
      }
      return { rows, totalDebits, totalCredits };
    }

    if (type === "PL") {
      // Profit & Loss
      const revenues = formattedAccounts.filter(a => a.type === "INCOME" && a.balance !== 0);
      const expenses = formattedAccounts.filter(a => a.type === "EXPENSE" && a.balance !== 0);

      const totalRevenue = revenues.reduce((sum, r) => sum + r.balance, 0);
      const totalExpense = expenses.reduce((sum, e) => sum + e.balance, 0);
      const netProfit = totalRevenue - totalExpense;

      return { revenues, expenses, totalRevenue, totalExpense, netProfit };
    }

    if (type === "BS") {
      // Balance Sheet
      const assets = formattedAccounts.filter(a => a.type === "ASSET" && a.balance !== 0);
      const liabilities = formattedAccounts.filter(a => a.type === "LIABILITY" && a.balance !== 0);

      const totalAssets = assets.reduce((sum, r) => sum + r.balance, 0);
      const totalLiabilities = liabilities.reduce((sum, e) => sum + e.balance, 0);
      
      // Equity is the balancing counterpart (Assets - Liabilities)
      const equity = totalAssets - totalLiabilities;

      return { assets, liabilities, totalAssets, totalLiabilities, equity };
    }

    return null;
  } catch (error) {
    console.error("Get financial reports error:", error);
    return null;
  }
}

// ─── DELETE ACCOUNT ─────────────────────────────────────────────────────────

async function _deleteAccount(accountId: string) {
  try {
    // Audit check: Prevent deleting an account if it has existing transactions or journal lines
    const [transactionCount, lineCount] = await Promise.all([
      prisma.transaction.count({ where: { accountId } }),
      prisma.journalLine.count({ where: { accountId } }),
    ]);

    if (transactionCount > 0 || lineCount > 0) {
      throw new Error("Cannot delete account because it has recorded financial ledger entries.");
    }

    await prisma.chartOfAccount.delete({
      where: { id: accountId },
    });

    revalidatePath("/admin/accounting");
    return { success: true };
  } catch (error: any) {
    console.error("Delete account error:", error);
    return { success: false, error: error.message || "Failed to delete account." };
  }
}

export const deleteAccount = withAuditLog(_deleteAccount, {
  entityType: "ChartOfAccount",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.chartOfAccount.findUnique({ where: { id } }),
  describe: (args) => `Deleted chart of account ${args[0]}`,
});

// ─── DELETE TRANSACTION ─────────────────────────────────────────────────────

async function _deleteTransaction(transactionId: string) {
  try {
    const txRecord = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!txRecord) throw new Error("Transaction not found");

    // Execute in a transaction block to delete legacy and double-entry lines simultaneously
    await prisma.$transaction(async (tx) => {
      // 1. Delete legacy transaction
      await tx.transaction.delete({
        where: { id: transactionId },
      });

      // 2. Locate and delete corresponding Journal Entries via reference or matches
      if (txRecord.referenceId) {
        await tx.journalEntry.deleteMany({
          where: { referenceId: txRecord.referenceId },
        });
      } else {
        await tx.journalEntry.deleteMany({
          where: {
            description: txRecord.description,
            date: txRecord.date,
          },
        });
      }
    });

    revalidatePath("/admin/accounting");
    return { success: true };
  } catch (error: any) {
    console.error("Delete transaction error:", error);
    return { success: false, error: error.message || "Failed to delete transaction." };
  }
}

export const deleteTransaction = withAuditLog(_deleteTransaction, {
  entityType: "Transaction",
  action: "DELETE",
  getEntityId: (args) => args[0],
  fetchBefore: (id) => prisma.transaction.findUnique({ where: { id }, include: { account: true } }),
  describe: (args) => `Deleted transaction ${args[0]}`,
});
