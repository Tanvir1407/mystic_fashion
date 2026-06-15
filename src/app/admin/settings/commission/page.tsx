import { redirect } from "next/navigation";

export default function CommissionSettingsPageRedirect() {
  redirect("/admin/settings?tab=commission");
}
