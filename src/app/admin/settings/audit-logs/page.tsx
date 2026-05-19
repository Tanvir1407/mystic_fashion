import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAuditLogSettings, getAuditUsers, getAuditEntityTypes } from "./actions";
import AuditLogsClient from "./AuditLogsClient";
import { isRouteAllowed } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage() {
  const session = await getSession();
  
  if (!session) {
    redirect("/admin/login");
  }

  // Security gate: Ensure only authorized admins can access audit trail
  const isAllowed = isRouteAllowed("/admin/settings/audit-logs", session);
  if (!isAllowed) {
    redirect("/admin/unauthorized");
  }

  // Fetch critical seed data for initial rendering
  const [settingsRes, usersRes, entitiesRes] = await Promise.all([
    getAuditLogSettings(),
    getAuditUsers(),
    getAuditEntityTypes(),
  ]);

  const initialSettings = settingsRes.success ? settingsRes.data : { id: "default", retentionDays: null };
  const distinctUsers = usersRes.success ? usersRes.data : [];
  const distinctEntities = entitiesRes.success ? entitiesRes.data : [];

  return (
    <AuditLogsClient
      initialSettings={initialSettings}
      distinctUsers={distinctUsers}
      distinctEntities={distinctEntities}
    />
  );
}
