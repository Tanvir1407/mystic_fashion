"use client";

import { useState, useTransition } from "react";
import { 
  AlertTriangle, 
  Settings2, 
  Save, 
  ShoppingCart, 
  Loader2, 
  PackageSearch, 
  FileSpreadsheet, 
  Printer,
  ArrowLeft,
  Search,
  ChevronRight,
  TrendingDown,
  Box
} from "lucide-react";
import { updateInventorySettings ,getAllLowStockProducts } from "../../actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { AdminPagination } from "@/components/AdminPagination";

export default function InventoryClient({ initialSettings, products, currentPage, totalPages  ,csvData}: { initialSettings: any, products: any[], currentPage: number, totalPages: number, csvData: any }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [threshold, setThreshold] = useState(initialSettings.lowStockThreshold);
  const [searchQuery, setSearchQuery] = useState("");

  const handleUpdate = () => {
    startTransition(async () => {
      await updateInventorySettings(threshold);
      router.refresh();
    });
  };
  //////////////////////////// Export to Excel Logic ///////////////////////////

const handleExportExcel = async () => {
  try {
    
    //const allProducts = await getAllLowStockProducts();

    if (!csvData || csvData.length === 0) {
      alert("No low stock products to export!");
      return;
    }

    
    const allSizes = Array.from(
      new Set(csvData.flatMap((p: any) => p.variants.map((v: any) => v.size)))
    );

     
    const sortedSizes = [
      "S", "M", "L", "XL", "2XL", "3XL",
      ...allSizes.filter(s => !["S", "M", "L", "XL", "2XL", "3XL"].includes(s as string ))
    ];

    
    let csv = "Product," + sortedSizes.join(",") + "\n";

    
    csvData.forEach((product: any) => {
      let row = `"${product.name}"`;
      sortedSizes.forEach(size => {
        const variant = product.variants.find((v: any) => v.size === size);
        row += `,${variant ? variant.stock : ""}`;
      });
      csv += row + "\n";
    });

    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Low_Stock_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error("Export failed:", error);
    alert("Something went wrong during export!");
  }
};

  const handlePrint = () => window.print();

  const allSizes = Array.from(new Set(products.flatMap(p => p.variants.map((v: any) => v.size))));
  const sortedSizes = ["S", "M", "L", "XL", "2XL", "3XL", ...allSizes.filter(s => !["S", "M", "L", "XL", "2XL", "3XL"].includes(s))];

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.team?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-slate-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Low Stock Alerts</h1>
            <p className="text-sm text-slate-500 mt-1">Monitor products reaching critical inventory levels.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="h-10 px-4 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="h-10 px-4 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4 text-indigo-500" />
            Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Settings Column */}
        <div className="lg:col-span-1 space-y-6 print:hidden">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5 text-slate-400" />
              Threshold Setting
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Alert units</label>
                <input
                  type="number"
                  value={threshold}
                  onChange={e => setThreshold(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm font-medium focus:bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all outline-none"
                />
              </div>
              <button
                onClick={handleUpdate}
                disabled={isPending || threshold === initialSettings.lowStockThreshold}
                className="w-full h-9 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Update Rule
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">Current Threshold: {initialSettings.lowStockThreshold}</p>
                <p className="text-[10px] text-amber-700 mt-1 leading-relaxed">
                  System flags any variant with {initialSettings.lowStockThreshold} or fewer units.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-4 mb-2 print:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Filter by product or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 shadow-sm"
              />
            </div>
            <div className="px-3 py-2 bg-slate-100 rounded-md text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
              {filteredProducts.length} Items At Risk
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 flex flex-col items-center justify-center text-center shadow-sm">
              <Box className="w-8 h-8 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500 italic">No low-stock products found matching your criteria.</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden print:hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider">Inventory Status</th>
                        <th className="px-4 py-3 font-semibold text-[10px] text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                                {product.images?.[0] ? (
                                  <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-bold uppercase">No Img</div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{product.name}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase">{product.team}</span>
                                  <span className="text-[10px] text-slate-300">•</span>
                                  <span className="text-[10px] text-slate-400 font-medium">{product.category}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {product.variants.map((v: any) => {
                                const isLow = v.stock <= initialSettings.lowStockThreshold;
                                return (
                                  <div 
                                    key={v.id} 
                                    className={`px-2 py-1 rounded text-[10px] font-bold border flex items-center gap-1.5 ${
                                      isLow 
                                      ? "bg-red-50 border-red-100 text-red-600" 
                                      : "bg-slate-50 border-slate-100 text-slate-400 opacity-60"
                                    }`}
                                  >
                                    <span className="opacity-70">{v.size}:</span>
                                    <span>{v.stock}</span>
                                    {isLow && <TrendingDown className="w-2.5 h-2.5" />}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Link 
                              href={`/admin/products/edit/${product.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded hover:bg-indigo-100 transition-colors uppercase tracking-wider"
                            >
                              Manage
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <AdminPagination currentPage={currentPage} totalPages={totalPages} />

              {/* Print View (unchanged logic, clean styling) */}
              <div className="hidden print:block">
                <div className="mb-6 border-b-2 border-slate-900 pb-4">
                  <h1 className="text-2xl font-bold uppercase text-slate-900">Low Stock Report</h1>
                  <p className="text-sm text-slate-500">Threshold: {initialSettings.lowStockThreshold} units • Generated {new Date().toLocaleDateString()}</p>
                </div>
                <table className="w-full border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 px-4 py-2 text-left text-xs font-bold uppercase">Product</th>
                      {sortedSizes.map(size => (
                        <th key={size} className="border border-slate-300 px-4 py-2 text-center text-xs font-bold uppercase w-16">{size}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(product => (
                      <tr key={product.id}>
                        <td className="border border-slate-300 px-4 py-2 text-xs font-bold uppercase">
                          {product.name}
                          <div className="text-[10px] text-slate-400 font-normal">{product.team}</div>
                        </td>
                        {sortedSizes.map(size => {
                          const variant = product.variants.find((v: any) => v.size === size);
                          const isLow = variant && variant.stock <= initialSettings.lowStockThreshold;
                          return (
                            <td key={size} className={`border border-slate-300 px-4 py-2 text-center text-sm font-mono ${isLow ? "bg-red-50 font-bold" : ""}`}>
                              {variant ? variant.stock : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
