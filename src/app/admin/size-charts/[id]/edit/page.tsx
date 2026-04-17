import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import SizeChartFormClient from "../../new/SizeChartFormClient";

export const dynamic = "force-dynamic";

export default async function EditSizeChartPage({ params }: { params: { id: string } }) {
  // @ts-ignore - Ignore TS error until prisma schema is pushed and generated locally by the user
  const chart = await prisma.sizeChart.findUnique({
    where: { id: params.id }
  });

  if (!chart) notFound();

  return <SizeChartFormClient initialData={chart} />;
}
