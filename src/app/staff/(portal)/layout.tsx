import { redirect } from "next/navigation";
import { getStaffSession } from "@/lib/staff-auth";
import StaffLayoutClient from "./StaffLayoutClient";
import "../../globals-admin.css";


export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();
  if (!session) {
    redirect("/staff/login");
  }

  return <StaffLayoutClient session={session}>{children}</StaffLayoutClient>;
}
