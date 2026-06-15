import { redirect } from "next/navigation";

export default function FooterSettingsPageRedirect() {
  redirect("/admin/settings?tab=footer");
}
