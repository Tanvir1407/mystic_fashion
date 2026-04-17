import prisma from "@/lib/prisma";
import Link from "next/link";
import { deleteSizeChart } from "../actions";
import { Plus, Edit2, Trash2, Ruler } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSizeChartsPage() {
  // @ts-ignore - Ignore TS error until prisma schema is pushed and generated locally by the user
  let sizeCharts: any[] = [];
  try {
    sizeCharts = await prisma.sizeChart.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
     console.error("Error fetching size charts:", error);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Size Charts</h1>
          <p className="text-sm text-slate-500 mt-1">Manage physical measurement tables mapped to product categories.</p>
        </div>
        <Link
          href="/admin/size-charts/new"
          className="h-10 px-4 bg-slate-900 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Chart
        </Link>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Product Category</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Available Sizes</th>
                <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {sizeCharts.map((chart: any) => {
                const dataArray = chart.data as any[];
                const sizesString = dataArray.map(d => d.size).join(", ");
                return (
                  <tr key={chart.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                          <Ruler className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm text-slate-900">{chart.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                      {sizesString}
                    </td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/size-charts/${chart.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                        title="Edit Size Chart"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Link>
                      <form action={async () => {
                        "use server";
                        await deleteSizeChart(chart.id);
                      }}>
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md hover:bg-red-100 hover:border-red-200 transition-colors cursor-pointer"
                          title="Delete Chart"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
              {sizeCharts.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center">
                    <p className="text-sm text-slate-500 font-medium">No active size charts mapped to categories.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
