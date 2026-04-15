"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Settings2, Save, ShoppingCart, Loader2, PackageSearch } from "lucide-react";
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      
      {/* Settings Card */}
      <div className="lg:col-span-1">
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2 uppercase tracking-wider">
                <PackageSearch className="w-4 h-4" />
                Found {products.length} Products at risk
              </h3>
            </div>
            
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
                          className={`flex flex-col items-center justify-center min-w-[60px] p-2 rounded-xl border transition-all ${
                            isLow 
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

                  <div className="flex-shrink-0">
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
        )}
      </div>
    </div>
  );
}
