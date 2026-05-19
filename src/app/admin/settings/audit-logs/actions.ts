"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { withAuditLog } from "@/lib/audit";

// Fetch the current audit settings
export async function getAuditLogSettings() {
  try {
    const setting = await prisma.auditLogSetting.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", retentionDays: null },
    });
    return { success: true, data: setting };
  } catch (error: any) {
    console.error("Error fetching audit settings:", error);
    return { success: false, error: error.message || "Failed to fetch settings." };
  }
}

// Internal update function to be wrapped by withAuditLog HOF
async function _updateAuditLogSettings(retentionDays: number | null) {
  try {
    const setting = await prisma.auditLogSetting.upsert({
      where: { id: "default" },
      update: { retentionDays },
      create: { id: "default", retentionDays },
    });

    // If a retention policy is configured, prune older logs immediately
    let prunedCount = 0;
    if (retentionDays !== null && retentionDays > 0) {
      const pruneDate = new Date();
      pruneDate.setDate(pruneDate.getDate() - retentionDays);
      const deleteResult = await prisma.activityLog.deleteMany({
        where: {
          timestamp: {
            lt: pruneDate,
          },
        },
      });
      prunedCount = deleteResult.count;
    }

    revalidatePath("/admin/settings/audit-logs");
    return { success: true, data: setting, prunedCount };
  } catch (error: any) {
    console.error("Error updating audit settings:", error);
    return { success: false, error: error.message || "Failed to update settings." };
  }
}

// Wrapped settings action with Audit HOF
export const updateAuditLogSettings = withAuditLog(_updateAuditLogSettings, {
  entityType: "AuditLogSetting",
  action: "UPDATE",
  getEntityId: () => "default",
  fetchBefore: (id) => prisma.auditLogSetting.findUnique({ where: { id } }),
  fetchAfter: (id) => prisma.auditLogSetting.findUnique({ where: { id } }),
  describe: (args) => {
    const days = args[0];
    return days === null
      ? "Changed audit log retention policy to keep logs indefinitely"
      : `Changed audit log retention policy to keep logs for ${days} days`;
  },
});

// Force prune logs now
export async function pruneLogsNowAction() {
  try {
    const setting = await prisma.auditLogSetting.findUnique({
      where: { id: "default" },
    });

    if (!setting || setting.retentionDays === null) {
      return { success: true, prunedCount: 0, message: "No retention policy configured. Logs are set to be kept indefinitely." };
    }

    const pruneDate = new Date();
    pruneDate.setDate(pruneDate.getDate() - setting.retentionDays);

    const deleteResult = await prisma.activityLog.deleteMany({
      where: {
        timestamp: {
          lt: pruneDate,
        },
      },
    });

    revalidatePath("/admin/settings/audit-logs");
    return {
      success: true,
      prunedCount: deleteResult.count,
      message: `Successfully pruned ${deleteResult.count} logs older than ${setting.retentionDays} days.`,
    };
  } catch (error: any) {
    console.error("Error in manually pruning logs:", error);
    return { success: false, error: error.message || "Failed to prune logs." };
  }
}

// Fetch list of distinct users who have performed actions (for filter dropdown)
export async function getAuditUsers() {
  try {
    const users = await prisma.activityLog.findMany({
      select: {
        userId: true,
        userEmail: true,
        userRole: true,
      },
      distinct: ["userId"],
    });
    return { success: true, data: users };
  } catch (error: any) {
    console.error("Error fetching distinct audit users:", error);
    return { success: false, error: error.message };
  }
}

// Fetch list of distinct entity types logged (for filter dropdown)
export async function getAuditEntityTypes() {
  try {
    const entities = await prisma.activityLog.findMany({
      select: {
        entityType: true,
      },
      distinct: ["entityType"],
    });
    return { success: true, data: entities.map(e => e.entityType) };
  } catch (error: any) {
    console.error("Error fetching distinct audit entity types:", error);
    return { success: false, error: error.message };
  }
}

// Paginated, filtered fetch of Activity Logs
export async function getPaginatedAuditLogs(params: {
  page: number;
  limit: number;
  userId?: string;
  action?: string;
  entityType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  try {
    const page = Math.max(1, params.page);
    const limit = Math.max(1, params.limit);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.userId && params.userId !== "all") {
      where.userId = params.userId;
    }

    if (params.action && params.action !== "all") {
      where.action = params.action;
    }

    if (params.entityType && params.entityType !== "all") {
      where.entityType = params.entityType;
    }

    if (params.search) {
      where.OR = [
        { description: { contains: params.search, mode: "insensitive" } },
        { userEmail: { contains: params.search, mode: "insensitive" } },
        { entityId: { contains: params.search, mode: "insensitive" } },
      ];
    }

    if (params.dateFrom || params.dateTo) {
      where.timestamp = {};
      if (params.dateFrom) {
        where.timestamp.gte = new Date(params.dateFrom);
      }
      if (params.dateTo) {
        const toDate = new Date(params.dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.timestamp.lte = toDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return {
      success: true,
      data: {
        logs,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error: any) {
    console.error("Error fetching paginated audit logs:", error);
    return { success: false, error: error.message || "Failed to fetch logs." };
  }
}
