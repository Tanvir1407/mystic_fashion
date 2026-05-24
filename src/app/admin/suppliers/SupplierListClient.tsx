"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Eye, X, Plus, Calendar, DollarSign, Phone, MapPin, Edit, CheckCircle, AlertCircle, Trash2, RotateCcw } from "lucide-react";
import { createSupplier, updateSupplier, deleteSupplier, restoreSupplier } from "@/app/admin/actions";
import { AdminPagination } from "@/components/AdminPagination";

interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  active: boolean;
  createdAt: Date;
  deletedAt?: Date | null;
  purchaseCount: number;
  totalSpent: number;
  purchases: {
    id: string;
    totalAmount: number;
    status: string;
    createdAt: Date;
  }[];
}

interface SupplierListClientProps {
  suppliers: Supplier[];
  searchVal: string;
  page: number;
  totalPages: number;
  currentTab?: string;
  canCreate: boolean;
  canEdit: boolean;
}

export default function SupplierListClient({
  suppliers,
  searchVal,
  page,
  totalPages,
  currentTab = "active",
  canCreate,
  canEdit,
}: SupplierListClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchVal);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sidebar Drawer state: "DETAILS" | "ADD" | "EDIT" | null
  const [drawerMode, setDrawerMode] = useState<"DETAILS" | "ADD" | "EDIT" | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Sync state with URL parameter if it changes externally
  useEffect(() => {
    setSearch(searchVal);
  }, [searchVal]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "1");
    if (val) {
      params.set("search", val);
    } else {
      params.delete("search");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to move this supplier to Trash?")) return;

    startTransition(async () => {
      const res = await deleteSupplier(id);
      if (!res.success) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleRestore = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      const res = await restoreSupplier(id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error);
      }
    });
  };

  const openAddDrawer = () => {
    setFormData({ name: "", phone: "", address: "", active: true });
    setFormError(null);
    setDrawerMode("ADD");
  };

  const openEditDrawer = (supplier: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || "",
      address: supplier.address || "",
      active: supplier.active,
    });
    setFormError(null);
    setDrawerMode("EDIT");
  };

  const openDetailsDrawer = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDrawerMode("DETAILS");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Supplier name is required.");
      return;
    }

    setFormLoading(true);
    setFormError(null);

    try {
      let result;
      if (drawerMode === "ADD") {
        result = await createSupplier(formData);
      } else if (drawerMode === "EDIT" && selectedSupplier) {
        result = await updateSupplier(selectedSupplier.id, formData);
      }

      if (result && result.success) {
        setDrawerMode(null);
        setSelectedSupplier(null);
        router.refresh();
      } else {
        setFormError(result?.error || "An error occurred during submission.");
      }
    } catch (err: any) {
      setFormError(err.message || "Something went wrong.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Toolbar / Search + Add Button */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-md text-sm focus:border-slate-300 focus:outline-none focus:ring-0 transition-colors shadow-sm"
          />
          {isPending && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#800020] border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {canCreate && currentTab === "active" && (
          <button
            onClick={openAddDrawer}
            className="h-10 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 mb-4">
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", "active");
            params.set("page", "1");
            router.push(`${pathname}?${params.toString()}`);
          }}
          className={`pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${
            currentTab === "active"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Active Partners
        </button>
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tab", "trash");
            params.set("page", "1");
            router.push(`${pathname}?${params.toString()}`);
          }}
          className={`pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-all ${
            currentTab === "trash"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Trash Bin
        </button>
      </div>

      {/* Main Grid Layout: Table + Optional Sidebar */}
      <div className="flex gap-6 items-start">
        {/* Table Container */}
        <div className="flex-1 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Supplier Name</th>
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Purchases</th>
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider">Total Outlay</th>
                  <th className="px-6 py-3 font-semibold text-xs text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                      selectedSupplier?.id === supplier.id && drawerMode === "DETAILS" ? "bg-slate-50" : ""
                    }`}
                    onClick={() => openDetailsDrawer(supplier)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{supplier.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Created {new Date(supplier.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">
                      {supplier.phone || <span className="text-slate-300">N/A</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          supplier.deletedAt
                            ? "bg-rose-50 text-rose-700"
                            : supplier.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {supplier.deletedAt ? "Deleted" : supplier.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-slate-700">
                        {supplier.purchaseCount} purchases
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      ৳{supplier.totalSpent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                      {currentTab === "trash" ? (
                        <button
                          onClick={(e) => handleRestore(supplier.id, e)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                      ) : (
                        <>
                          {canEdit && (
                            <button
                              onClick={(e) => openEditDrawer(supplier, e)}
                              className="h-8 w-8 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md transition-colors shadow-sm"
                              title="Edit Supplier"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openDetailsDrawer(supplier)}
                            className="h-8 w-8 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-md transition-colors shadow-sm"
                            title="View Purchases"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={(e) => handleDelete(supplier.id, e)}
                              disabled={isPending}
                              className="h-8 w-8 inline-flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-900 rounded-md transition-colors shadow-sm disabled:opacity-50"
                              title="Move to Trash"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {suppliers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium text-sm">
                      No supplier records found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination currentPage={page} totalPages={totalPages} />
        </div>

        {/* Sliding Sidebar Drawer Panel */}
        {drawerMode && (
          <div className="w-96 bg-white border border-slate-200 rounded-lg shadow-md shrink-0 sticky top-4 flex flex-col max-h-[85vh] overflow-hidden animate-slide-in">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm truncate max-w-[200px]">
                  {drawerMode === "ADD"
                    ? "Add Supplier"
                    : drawerMode === "EDIT"
                    ? `Edit: ${selectedSupplier?.name}`
                    : selectedSupplier?.name}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {drawerMode === "DETAILS" ? "Partner Procurement Records" : "Supplier Configuration"}
                </p>
              </div>
              <button
                onClick={() => {
                  setDrawerMode(null);
                  setSelectedSupplier(null);
                }}
                className="w-6 h-6 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* DETAILS MODE SIDEBAR */}
            {drawerMode === "DETAILS" && selectedSupplier && (
              <>
                {/* Contact Block */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                  {selectedSupplier.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="font-mono">{selectedSupplier.phone}</span>
                    </div>
                  )}
                  {selectedSupplier.address && (
                    <div className="flex items-start gap-2 text-slate-600">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                      <span className="leading-relaxed">{selectedSupplier.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-600">
                    <CheckCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span>Status: {selectedSupplier.active ? "Active Partner" : "Suspended"}</span>
                  </div>
                </div>

                {/* Purchase History List Header */}
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/20">
                  <h5 className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Procurement Invoices ({selectedSupplier.purchaseCount})
                  </h5>
                </div>

                {/* Purchase Items List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[400px]">
                  {selectedSupplier.purchases.map((purchase) => (
                    <div key={purchase.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-slate-700">
                          Ref: #{purchase.id.slice(-6).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-1.5 text-slate-400 mt-1">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{new Date(purchase.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">৳{purchase.totalAmount.toLocaleString()}</div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold mt-1 uppercase ${
                            purchase.status === "COMPLETED" || purchase.status === "RECEIVED"
                              ? "bg-emerald-50 text-emerald-700"
                              : purchase.status === "CANCELLED"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {purchase.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {selectedSupplier.purchases.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium">
                      No wholesale purchases logged with this supplier.
                    </div>
                  )}
                </div>
              </>
            )}

            {/* FORM ADD/EDIT MODE */}
            {(drawerMode === "ADD" || drawerMode === "EDIT") && (
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-md flex items-start gap-2 text-rose-700 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Supplier / Factory Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter factory or manufacturer name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:border-slate-300 focus:outline-none"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Phone Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. +88017XXXXXXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:border-slate-300 focus:outline-none font-mono"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500">Factory / Supplier Address</label>
                  <textarea
                    placeholder="Enter full physical address or details"
                    value={formData.address}
                    rows={3}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-sm focus:border-slate-300 focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Active partner */}
                <div className="flex items-center justify-between py-2 border-t border-slate-100">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-700">Active Procurement Status</div>
                    <div className="text-[10px] text-slate-400">Controls if purchases can be logged with this partner.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                    className="w-4 h-4 accent-slate-900 border-slate-200 rounded cursor-pointer"
                  />
                </div>

                {/* Submit action buttons */}
                <div className="flex items-center gap-3 pt-4 mt-auto border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerMode(null);
                      setSelectedSupplier(null);
                    }}
                    className="flex-1 h-10 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="flex-1 h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors flex items-center justify-center"
                  >
                    {formLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : drawerMode === "ADD" ? (
                      "Create Partner"
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
