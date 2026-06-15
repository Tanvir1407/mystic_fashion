import { getSession } from "@/lib/auth";
import AdminLayoutClient from "./AdminLayoutClient";
import "../globals-admin.css";


export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <AdminLayoutClient session={session}>
      {children}
    </AdminLayoutClient>
  );
}
export const metadata = {
  title: "Mystic Fashion Admin",
};
export const dynamic = 'force-dynamic';
