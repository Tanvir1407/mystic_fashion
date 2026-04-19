"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Settings2, Save, ShoppingCart, Loader2, PackageSearch, FileSpreadsheet, Printer } from "lucide-react";
import { updateInventorySettings } from "../actions";
import { useRouter } from "next/navigation";

export default function InventoryClient({ initialSettings, products }: { initialSettings: any, products: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [threshold, setThreshold] = useState(initialSettings.lowStockThreshold);

  const handleUpdate = () => {
    startTransition(async () => {
      await updateInventorySettings(threshold);
      router.refresh();
    });
  };

  const handleExportExcel = () => {
    // Collect all unique sizes for columns
    const allSizes = Array.from(new Set(products.flatMap(p => p.variants.map((v: any) => v.size))));
    const sortedSizes = ["S", "M", "L", "XL", "2XL", "3XL", ...allSizes.filter(s => !["S", "M", "L", "XL", "2XL", "3XL"].includes(s))];

    // CSV Header
    let csv = "Product," + sortedSizes.join(",") + "\n";

    // CSV Rows
    products.forEach(product => {
      let row = `"${product.name}"`;
      sortedSizes.forEach(size => {
        const variant = product.variants.find((v: any) => v.size === size);
        row += `,${variant ? variant.stock : ""}`;
      });
      csv += row + "\n";
    });

    // Download Trigger
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Low_Stock_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // Get dynamic sizes for the table header mapping
  const allSizes = Array.from(new Set(products.flatMap(p => p.variants.map((v: any) => v.size))));
  const sortedSizes = ["S", "M", "L", "XL", "2XL", "3XL", ...allSizes.filter(s => !["S", "M", "L", "XL", "2XL", "3XL"].includes(s))];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

      {/* Settings Card */}
      <div className="lg:col-span-1 print:hidden">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-indigo-500" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-800">Alert Rules</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Stock Threshold
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={threshold}
                  onChange={e => setThreshold(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
                Products with remaining stock equal to or less than this value will be flagged as "Low Stock".
              </p>
            </div>

            <button
              onClick={handleUpdate}
              disabled={isPending || threshold === initialSettings.lowStockThreshold}
              className="w-full h-12 flex items-center justify-center gap-2 bg-slate-900 text-white text-xs font-black rounded-xl hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  SAVE RULE
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="lg:col-span-3 space-y-6">
        {products.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-20 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Inventory Healthy</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">All product variants are currently above your safety threshold of {initialSettings.lowStockThreshold} units.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between mb-2 print:hidden">
              <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2 uppercase tracking-wider">
                <PackageSearch className="w-4 h-4" />
                Found {products.length} Products at risk
              </h3>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-all uppercase tracking-widest"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Excel
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all uppercase tracking-widest"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
              </div>
            </div>

            <div className="print:hidden space-y-4">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-100 flex-shrink-0 overflow-hidden">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">NO IMG</div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors uppercase tracking-tighter text-lg">{product.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-black text-slate-500">{product.team}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{product.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 md:justify-end">
                      {product.variants.map((variant: any) => {
                        const isLow = variant.stock <= initialSettings.lowStockThreshold;
                        return (
                          <div
                            key={variant.id}
                            className={`flex flex-col items-center justify-center min-w-[60px] p-2 rounded-xl border transition-all ${isLow
                                ? "bg-amber-50 border-amber-200 ring-2 ring-amber-500/10"
                                : "bg-slate-50 border-slate-100 opacity-50"
                              }`}
                          >
                            <span className={`text-[10px] font-black uppercase mb-1 ${isLow ? "text-amber-700" : "text-slate-400"}`}>
                              {variant.size}
                            </span>
                            <span className={`text-lg font-black font-mono leading-none ${isLow ? "text-amber-600" : "text-slate-500"}`}>
                              {variant.stock}
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex-shrink-0 md:block hidden">
                      <button
                        onClick={() => router.push(`/admin/products`)}
                        className="p-3 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center"
                      >
                        <ShoppingCart className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Print View Table */}
            <div className="hidden print:block">
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Low Stock Alert Report</h1>
                <p className="text-slate-500 font-bold mt-2">Generated on {new Date().toLocaleDateString()} | Threshold: {initialSettings.lowStockThreshold} units</p>
              </div>

              <table className="w-full border-collapse border border-slate-900 overflow-hidden rounded-lg">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-900 px-4 py-3 text-left font-black uppercase text-xs">Product</th>
                    {sortedSizes.map(size => (
                      <th key={size} className="border border-slate-900 px-4 py-3 text-center font-black uppercase text-xs w-20">{size}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-slate-200">
                      <td className="border border-slate-900 px-4 py-3 font-bold text-sm text-slate-900 uppercase">
                        {product.name}
                        <div className="text-[10px] text-slate-400 font-black">{product.team} | {product.category}</div>
                      </td>
                      {sortedSizes.map(size => {
                        const variant = product.variants.find((v: any) => v.size === size);
                        const isLow = variant && variant.stock <= initialSettings.lowStockThreshold;
                        return (
                          <td
                            key={size}
                            className={`border border-slate-900 px-4 py-3 text-center font-black font-mono text-lg ${isLow ? "bg-[#e2efda] text-slate-900" : "text-slate-900"
                              }`}
                          >
                            {variant ? variant.stock : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
