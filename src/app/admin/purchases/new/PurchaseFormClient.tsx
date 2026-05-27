"use client";

import { useState } from "react";
import { createPurchase, updatePurchase } from "../actions";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomSelect } from "@/components/CustomSelect";

export default function PurchaseFormClient({
  products,
  suppliers = [],
  initialData
}: {
  products: any[],
  suppliers?: any[],
  initialData?: any
}) {
  const router = useRouter();
  const isEditing = !!initialData;

  const initialSupplier = suppliers.find(s => s.id === initialData?.supplierId || s.name === initialData?.supplierName);
  const [isNewSupplier, setIsNewSupplier] = useState(suppliers.length === 0 || (isEditing ? !initialSupplier : false));
  const [selectedSupplierId, setSelectedSupplierId] = useState(initialSupplier?.id || "");
  const [supplierName, setSupplierName] = useState(initialData?.supplierName || "");
  const [invoiceNumber, setInvoiceNumber] = useState(initialData?.invoiceNumber || "");
  const [totalDiscount, setTotalDiscount] = useState((initialData?.discountAmount || 0).toString());
  const [loading, setLoading] = useState(false);
  const [isAutoSizeEnabled, setIsAutoSizeEnabled] = useState(true);

  const handleToggleMode = (mode: boolean) => {
    setIsNewSupplier(mode);
    if (!mode) {
      const s = suppliers.find(sup => sup.id === selectedSupplierId);
      setSupplierName(s ? s.name : "");
    } else {
      setSupplierName("");
    }
  };

  // Initialize items or default to one blank item
  const defaultItems = initialData?.items?.length > 0
    ? initialData.items.map((i: any) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      unitPrice: i.unitPrice
    }))
    : [{ id: "1", productId: "", variantId: "", quantity: 0, unitPrice: "" as number | string }];

  const productOptions = products.map(p => ({
    value: p.id,
    label: `${p.name} - ${p.category}`
  }));

  const [items, setItems] = useState<{ id: string, productId: string, variantId: string, quantity: number, unitPrice: number | string }[]>(defaultItems);
  const totalUnits = items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0);
  const subtotal = items.reduce((acc, item) => acc + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
  const grandTotal = subtotal - (parseFloat(totalDiscount) || 0);

  const addItem = () => {
    setItems([{ id: Date.now().toString(), productId: "", variantId: "", quantity: 0, unitPrice: "" }, ...items]);
  };

  const clearItems = () => {
    if (confirm("Are you sure you want to clear all rows?")) {
      setItems([{ id: Date.now().toString(), productId: "", variantId: "", quantity: 0, unitPrice: "" }]);
    }
  };

  const removeItem = (id: string) => {
    if (items.length === 1) return; // Optional safety guard
    setItems(items.filter(i => i.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    if (field === 'productId' && isAutoSizeEnabled && value) {
      const selectedProduct = products.find(p => p.id === value);
      const variants = selectedProduct?.variants || [];

      if (variants.length > 0) {
        setItems(prevItems => {
          const currentItemIndex = prevItems.findIndex(i => i.id === id);
          if (currentItemIndex === -1) return prevItems;

          const currentItem = prevItems[currentItemIndex];
          const newRows = variants.map((v: any, index: number) => ({
            ...currentItem,
            id: index === 0 ? currentItem.id : Date.now().toString() + "-" + index,
            productId: value,
            variantId: v.id,
          }));

          const nextItems = [...prevItems];
          nextItems.splice(currentItemIndex, 1, ...newRows);
          return nextItems;
        });
        return;
      }
    }

    setItems(items.map(i => {
      if (i.id === id && field === 'productId') {
        return { ...i, [field]: value, variantId: "" };
      }
      return i.id === id ? { ...i, [field]: value } : i;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return alert("Supplier Name is required.");

    if (items.length === 0) return alert("Please select at least one Product.");

    for (const item of items) {
      if (!item.productId || !item.variantId) return alert("All purchase items must have a valid Product and Size Variant selected.");
      if (item.quantity <= 0) return alert("Quantities must be greater than 0.");
      const unitPriceNum = Number(item.unitPrice);
      if (isNaN(unitPriceNum) || unitPriceNum < 0) return alert("Unit cost must be a valid non-negative number.");
    }

    setLoading(true);
    const cleanedItems = items.map(({ id, ...rest }) => ({ ...rest, unitPrice: Number(rest.unitPrice) || 0 }));

    if (isEditing) {
      const res = await updatePurchase(
        initialData.id,
        supplierName.trim(),
        invoiceNumber.trim() || "",
        grandTotal,
        parseFloat(totalDiscount || "0"),
        cleanedItems
      );
      if (res && res.success) {
        router.push("/admin/purchases");
      } else {
        alert(res?.error || "Failed to update purchase");
        setLoading(false);
      }
    } else {
      const res = await createPurchase(
        supplierName.trim(),
        invoiceNumber.trim() || "",
        grandTotal,
        parseFloat(totalDiscount || "0"),
        cleanedItems
      );
      if (res && res.success) {
        router.push("/admin/purchases");
      } else {
        alert(res?.error || "Failed to save purchase");
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col pb-12">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/purchases" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors text-slate-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{isEditing ? "Edit Purchase" : "Log New Purchase"}</h1>
          <p className="text-sm text-slate-500 mt-1">{isEditing ? "Modify this invoice; inventory stock will be adjusted by recalculating differences." : "Record inward inventory delivery to automatically boost stock counts."}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-slate-900">Supplier Name *</label>
              <div className="flex gap-1 p-0.5 bg-slate-100 rounded-md">
                <button
                  type="button"
                  onClick={() => handleToggleMode(false)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-all ${
                    !isNewSupplier
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Select Existing
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode(true)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-sm transition-all ${
                    isNewSupplier
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  + Add New
                </button>
              </div>
            </div>

            {!isNewSupplier ? (
              <CustomSelect
                options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                value={selectedSupplierId}
                onChange={(val) => {
                  setSelectedSupplierId(val);
                  const s = suppliers.find(sup => sup.id === val);
                  if (s) setSupplierName(s.name);
                }}
                placeholder="-- Select Existing Supplier --"
                searchable={true}
                heightClass="h-9"
                textClass="text-sm"
              />
            ) : (
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Mystic Vendor Co."
                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
                required
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">Invoice / Reference #</label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-XXXXX"
              className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-md mb-8">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center rounded-t-md">
            <h3 className="text-sm font-semibold text-slate-700">Add Products Form</h3>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer mr-2">
                <input
                  type="checkbox"
                  checked={isAutoSizeEnabled}
                  onChange={(e) => setIsAutoSizeEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer transition-colors"
                />
                Auto Size Select
              </label>
              <button
                type="button"
                onClick={clearItems}
                disabled={items.length === 0 || (items.length === 1 && !items[0].productId)}
                className="text-xs font-bold text-red-600 border border-red-300 flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md shadow-sm hover:shadow transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
              <button
                type="button"
                onClick={addItem}
                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-1.5 px-4 py-2 rounded-md shadow-sm hover:shadow transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Row
              </button>
            </div>
          </div>
          <div className="overflow-visible">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[40%]">Target Product</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[20%]">Size Variant</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24">QTY</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Unit Price (৳)</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Total Price (৳)</th>
                  <th className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const selectedProduct = products.find(p => p.id === item.productId);
                  const availableVariants = selectedProduct?.variants || [];
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-2 min-w-[300px]">
                        <CustomSelect
                          options={productOptions}
                          value={item.productId}
                          onChange={(val) => updateItem(item.id, "productId", val)}
                          placeholder="-- Target Catalog Item --"
                          searchable={true}
                          heightClass="h-9"
                          textClass="text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 min-w-[150px]">
                        <CustomSelect
                          options={availableVariants.map((v: any) => ({ value: v.id, label: v.size }))}
                          value={item.variantId}
                          onChange={(val) => updateItem(item.id, "variantId", val)}
                          placeholder="-- Size --"
                          disabled={!item.productId || availableVariants.length === 0}
                          heightClass="h-9"
                          textClass="text-sm"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, "unitPrice", (e.target.value))}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={Number((item.quantity * (Number(item.unitPrice) || 0)).toFixed(3))}
                          readOnly
                          className="w-full px-3 py-1.5 border border-slate-100 rounded text-sm bg-slate-50 text-slate-500 font-mono text-right"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full md:w-[480px] ml-auto bg-slate-50 p-6 rounded-lg border border-slate-200 mb-8 shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Total Units Received</span>
              <span className="text-slate-900 font-mono font-bold text-lg">{totalUnits}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 font-medium">Subtotal (Item Sum)</span>
              <span className="text-slate-900 font-mono font-bold text-lg">৳ {Number(subtotal.toFixed(3))}</span>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-500 font-medium">Supplier Discount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">৳</span>
                <input
                  type="number"
                  step="0.001"
                  value={totalDiscount}
                  onChange={(e) => setTotalDiscount(e.target.value)}
                  className="w-32 pl-7 pr-3 py-1.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono text-right transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-200 flex items-center justify-between">
            <span className="text-base font-semibold text-slate-900">Grand Total Paid</span>
            <span className="text-2xl font-bold text-indigo-600 font-mono">৳ {Number(grandTotal.toFixed(3))}</span>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
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
            {isEditing ? "Save Changes & Update Stock" : "Save Purchase & Dispatch Stock Updates"}
          </button>
        </div>
      </div>
    </form>
  );
}
