import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import StaffDetailsClient from "./StaffDetailsClient";

export const dynamic = "force-dynamic";

export default async function StaffPerformancePage({ params }: { params: { id: string } }) {
  const staff = await prisma.staff.findUnique({
    where: { id: params.id },
    include: {
      role: {
        include: {
          permissions: true,
        },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!staff) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto pb-10 px-4 sm:px-6">
      <StaffDetailsClient staff={staff} />
    </div>
  );
}
