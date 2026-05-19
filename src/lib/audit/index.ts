/**
 * Audit Trail System
 *
 * Provides automatic activity logging for Server Actions.
 *
 * Usage:
 * ```typescript
 * import { withAuditLog } from "@/lib/audit";
 *
 * async function _createProduct(data: ProductData) { ... }
 *
 * export const createProduct = withAuditLog(_createProduct, {
 *   entityType: "Product",
 *   action: "CREATE",
 *   getEntityId: () => null,
 *   getEntityIdFromResult: (r) => r?.data?.id ?? null,
 *   fetchAfter: (id) => prisma.product.findUnique({ where: { id } }),
 *   describe: (args) => `Created product "${args[0].name}"`,
 * });
 * ```
 */

export { withAuditLog, logActivity, sanitizeSnapshot, computeChangedFields } from "./logger";
export { getAuditContext } from "./context";
export type { AuditContext, ActivityLogData, AuditLogConfig } from "./types";
export { SENSITIVE_FIELDS } from "./types";
