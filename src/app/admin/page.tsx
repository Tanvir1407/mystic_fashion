import { redirect } from "next/navigation";

export default function AdminDashboardPage() {
  // Always redirect to products page as the default dashboard view
  redirect("/admin/products");
}
