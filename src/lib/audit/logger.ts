import prisma from "@/lib/prisma";
import { getAuditContext } from "./context";
import { SENSITIVE_FIELDS } from "./types";
import type { ActivityLogData, AuditLogConfig } from "./types";
import type { AuditAction } from "@/generated/prisma/client";
import type { Prisma } from "@/generated/prisma/client";


// ─── Core Log Writer (Fire-and-Forget) ──────────────────────────────────────

/**
 * Writes an activity log entry to the database.
 *
 * This function is designed to be called WITHOUT await (fire-and-forget)
 * so it never blocks the main business logic. Errors are caught and logged
 * to stderr — they never propagate to the caller.
 */
export function logActivity(data: ActivityLogData): void {
  prisma.activityLog
    .create({
      data: {
        userId: data.userId,
        userEmail: data.userEmail,
        userRole: data.userRole,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        description: data.description,
        dataBefore: (data.dataBefore as Prisma.InputJsonValue) ?? undefined,
        dataAfter: (data.dataAfter as Prisma.InputJsonValue) ?? undefined,
        changedFields: data.changedFields ?? [],
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    })
    .catch((err) => {
      console.error("[AuditLog] Failed to write activity log:", err);
    });
}

// ─── Snapshot Sanitizer ─────────────────────────────────────────────────────

/**
 * Strips sensitive fields (passwords, tokens, etc.) from a data snapshot
 * before it is stored in the JSONB column.
 *
 * Operates on a shallow copy — never mutates the input.
 */
export function sanitizeSnapshot(
  data: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!data) return null;

  const sanitized = { ...data };

  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = "[REDACTED]";
    }
  }

  // Strip Prisma relation objects (nested objects/arrays) to keep snapshots flat
  // Relations are model-specific and make diffs noisy
  for (const [key, value] of Object.entries(sanitized)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      delete sanitized[key];
    }
  }

  return sanitized;
}

// ─── Changed Fields Differ ──────────────────────────────────────────────────

/**
 * Compares two snapshots and returns the list of field names that differ.
 * Only compares top-level scalar fields.
 */
export function computeChangedFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): string[] {
  if (!before || !after) return [];

  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    const beforeVal = before[key];
    const afterVal = after[key];

    // Skip if both undefined
    if (beforeVal === undefined && afterVal === undefined) continue;

    // Compare using JSON.stringify for deep equality on primitives/arrays
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changedFields.push(key);
    }
  }

  return changedFields;
}

/**
 * Post-processes generated activity descriptions to replace/inject human-readable names.
 * Strips raw UUIDs/IDs or appends nice parenthesized identifiers where possible.
 */
export function enhanceDescriptionWithHumanNames(
  description: string,
  entityId: string,
  dataBefore: Record<string, unknown> | null,
  dataAfter: Record<string, unknown> | null
): string {
  if (!entityId) return description;

  // Extract a human-readable identifier from the before/after snapshots
  let name = "";
  const data = dataAfter || dataBefore;
  if (data) {
    if (typeof data.name === "string" && data.name.trim()) {
      name = data.name.trim();
    } else if (typeof data.code === "string" && data.code.trim()) {
      name = data.code.trim();
    } else if (typeof data.username === "string" && data.username.trim()) {
      name = data.username.trim();
    } else if (typeof data.category === "string" && data.category.trim()) {
      name = data.category.trim();
    } else if (typeof data.title === "string" && data.title.trim()) {
      name = data.title.trim();
    } else if (typeof data.customerName === "string" && data.customerName.trim()) {
      name = data.customerName.trim();
    }
  }

  if (!name) return description;

  const formattedName = `"${name}"`;

  // If the description contains the raw ID, replace it with the human-readable name and put the ID in parentheses.
  // For example: "Updated product 7de57a00-..." -> "Updated product "Blue Cotton T-Shirt" (7de57a00-...)"
  if (description.includes(entityId)) {
    // Avoid double-wrapping if the describer already added quotes or formatted it
    if (description.includes(`"${name}"`) || description.includes(`'${name}'`)) {
      return description;
    }
    return description.replace(entityId, `${formattedName} (${entityId})`);
  }

  return description;
}

// ─── Higher-Order Function Wrapper ──────────────────────────────────────────

/**
 * Wraps a Server Action with automatic audit logging.
 *
 * The original function's body is NEVER modified — it executes exactly as before.
 * Logging is performed around it:
 *   1. Before: fetch the "before" snapshot (UPDATE/DELETE)
 *   2. Execute: run the original function
 *   3. After: fetch the "after" snapshot (CREATE/UPDATE), compute diff, fire log
 *
 * If the audit context is null (no session / public route), logging is skipped entirely.
 * If any logging step fails, the original function's result is still returned.
 *
 * @example
 * ```typescript
 * async function _deleteAccount(accountId: string) { ... }
 *
 * export const deleteAccount = withAuditLog(_deleteAccount, {
 *   entityType: "ChartOfAccount",
 *   action: "DELETE",
 *   getEntityId: (args) => args[0],
 *   fetchBefore: (id) => prisma.chartOfAccount.findUnique({ where: { id } }),
 *   describe: (args) => `Deleted chart of account ${args[0]}`,
 * });
 * ```
 */
export function withAuditLog<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  config: AuditLogConfig<TArgs, TResult>
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    // ── 1. Get audit context (session + request info) ───────────────
    let auditContext: Awaited<ReturnType<typeof getAuditContext>> = null;
    try {
      auditContext = await getAuditContext();
    } catch {
      // If context extraction fails, proceed without logging
    }

    // No authenticated session → skip logging (public route or session error)
    if (!auditContext) {
      return fn(...args);
    }

    // ── 2. Fetch "before" snapshot (UPDATE/DELETE only) ─────────────
    let dataBefore: Record<string, unknown> | null = null;
    const entityId = await config.getEntityId(args);

    if (
      (config.action === "UPDATE" || config.action === "DELETE") &&
      entityId &&
      config.fetchBefore
    ) {
      try {
        const raw = await config.fetchBefore(entityId);
        dataBefore = sanitizeSnapshot(raw as Record<string, unknown> | null);
      } catch (err) {
        console.error("[AuditLog] Failed to fetch 'before' snapshot:", err);
      }
    }

    // ── 3. Execute the original function ────────────────────────────
    // Wrapped in try/catch to handle Next.js redirect() throws.
    // redirect() throws a special NEXT_REDIRECT error AFTER the DB mutation
    // succeeds, so we must still log the activity before re-throwing.
    let result: TResult | undefined;
    let caughtError: unknown = null;

    try {
      result = await fn(...args);
    } catch (err: any) {
      caughtError = err;
    }

    // ── 4. Post-mutation logging (fire-and-forget) ──────────────────
    try {
      // Resolve the final entity ID
      // For CREATE actions, the ID comes from the result
      let finalEntityId = entityId;
      if (!finalEntityId && result && config.getEntityIdFromResult) {
        finalEntityId = await config.getEntityIdFromResult(result);
      }

      // If we have an entity ID, proceed with logging
      if (finalEntityId) {
        // Fetch "after" snapshot (CREATE/UPDATE only)
        let dataAfter: Record<string, unknown> | null = null;
        if (
          (config.action === "CREATE" || config.action === "UPDATE") &&
          config.fetchAfter
        ) {
          try {
            const raw = await config.fetchAfter(finalEntityId);
            dataAfter = sanitizeSnapshot(raw as Record<string, unknown> | null);
          } catch (err) {
            console.error("[AuditLog] Failed to fetch 'after' snapshot:", err);
          }
        }

        // Compute changed fields for UPDATE actions
        const changedFields =
          config.action === "UPDATE"
              ? computeChangedFields(dataBefore, dataAfter)
              : [];

        // Generate description
        const rawDescription = config.describe
          ? await config.describe(args, dataBefore, dataAfter)
          : `${config.action} ${config.entityType} ${finalEntityId}`;

        const description = enhanceDescriptionWithHumanNames(
          rawDescription,
          finalEntityId,
          dataBefore,
          dataAfter
        );

        // Fire-and-forget: write the log entry
        logActivity({
          userId: auditContext.userId,
          userEmail: auditContext.userEmail,
          userRole: auditContext.userRole,
          action: config.action as AuditAction,
          entityType: config.entityType,
          entityId: finalEntityId,
          description,
          dataBefore,
          dataAfter,
          changedFields,
          ipAddress: auditContext.ipAddress,
          userAgent: auditContext.userAgent,
        });
      }
    } catch (err) {
      // Logging failure must NEVER affect the original operation
      console.error("[AuditLog] Post-mutation logging error:", err);
    }

    // Re-throw if the original function threw (e.g., Next.js redirect)
    if (caughtError) {
      throw caughtError;
    }

    return result as TResult;
  };
}
