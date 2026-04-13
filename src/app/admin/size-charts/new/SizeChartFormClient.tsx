"use client";

import { useState } from "react";
import { saveSizeChart } from "../../actions";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SizeChartFormClient({ initialData }: { initialData?: any }) {
  const [category, setCategory] = useState(initialData?.category || "");
  const [rows, setRows] = useState<{ id: string, size: string, length: string, chest: string, sleeve: string }[]>(
    initialData?.data?.map((r: any, idx: number) => ({ id: String(idx), ...r })) || [
      { id: "1", size: "S", length: "27.0", chest: "38.0", sleeve: "8.0" },
      { id: "2", size: "M", length: "28.0", chest: "40.0", sleeve: "8.5" },
      { id: "3", size: "L", length: "29.0", chest: "42.0", sleeve: "9.0" },
      { id: "4", size: "XL", length: "30.0", chest: "44.0", sleeve: "9.5" },
      { id: "5", size: "XXL", length: "31.0", chest: "46.0", sleeve: "10.0" }
    ]
  );
  const [loading, setLoading] = useState(false);

  const addRow = () => {
    setRows([...rows, { id: Date.now().toString(), size: "", length: "", chest: "", sleeve: "" }]);
  };

  const removeRow = (id: string) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: string, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category.trim()) return alert("Please specify a Category mapped to this Size Chart.");
    
    setLoading(true);
    const dataPayload = rows.map(({ id, ...rest }) => rest);
    await saveSizeChart(category.trim(), dataPayload);
    // Redirect happens server side inside action
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/size-charts" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {initialData ? 'Edit Size Chart' : 'Create Size Chart'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Bind this size chart to a specific product category (e.g. "Jersey").</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="mb-6">
          <label className="block text-sm font-semibold text-slate-900 mb-2">Target Product Category</label>
          <input 
            type="text" 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!!initialData}
            placeholder="e.g. Jersey"
            className="w-full max-w-md px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm disabled:bg-slate-50 disabled:text-slate-500"
            required
          />
          {initialData && <p className="text-xs text-slate-400 mt-2">Category bindings cannot be changed after creation. Delete and recreate if needed.</p>}
        </div>

        <div className="border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Size Name</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Length (inches)</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Chest (inches)</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sleeve (inches)</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={row.size} 
                      onChange={(e) => updateRow(row.id, "size", e.target.value)}
                      placeholder="e.g. S"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={row.length} 
                      onChange={(e) => updateRow(row.id, "length", e.target.value)}
                      placeholder="27.0"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={row.chest} 
                      onChange={(e) => updateRow(row.id, "chest", e.target.value)}
                      placeholder="38.0"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input 
                      type="text" 
                      value={row.sleeve} 
                      onChange={(e) => updateRow(row.id, "sleeve", e.target.value)}
                      placeholder="8.0"
                      className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button 
                      type="button" 
                      onClick={() => removeRow(row.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-slate-50 p-3 border-t border-slate-200 text-center">
            <button 
               type="button"
               onClick={addRow}
               className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 mx-auto"
            >
              <Plus className="w-4 h-4" />
              Add Size Row
            </button>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="px-6 py-2.5 bg-slate-900 text-white font-medium rounded-md flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:opacity-75 shadow-sm"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Size Chart
          </button>
        </div>
      </div>
    </form>
  );
}
