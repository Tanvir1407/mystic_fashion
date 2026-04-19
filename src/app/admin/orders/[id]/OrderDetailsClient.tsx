"use client";

import { useState } from "react";
import { User, MapPin, Phone, Edit2, Check, X, Package, Wallet, StickyNote, Save, Minus, VerifiedIcon } from "lucide-react";
import { updateOrderDetails, updateOrderRemark } from "../../actions";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CustomSelect } from "@/components/CustomSelect";

export default function OrderDetailsClient({ order, deliverySettings }: { order: any; deliverySettings: any }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remarkLoading, setRemarkLoading] = useState(false);
  const [isEditingRemark, setIsEditingRemark] = useState(false);
  const [remarks, setRemarks] = useState(order.remarks || "");
  console.log(order)
  const [formData, setFormData] = useState({
    customerName: order.customerName,
    phone: order.phone,
    district: order.district,
    address: order.address,
    advancePaid: order.advancePaid || 0,
    discountAmount: order.discountAmount || 0,
  });

  const handleSave = async () => {
    setLoading(true);
    const result = await updateOrderDetails(order.id, formData);
    if (result.success) {
      setIsEditing(false);
      router.refresh();
    } else {
      alert(result.error || "Failed to update order");
    }
    setLoading(false);
  };

  const formatBDT = (price: number) => {
    return price === 0 ? "Free" : `৳${price.toLocaleString("en-IN")}`;
  };

  const baseSubtotal = order.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  const totalDTFCost = order.items.reduce((acc: number, item: any) => acc + (item.requiresPrint ? item.printCost * item.quantity : 0), 0);
  const discount = order.discountAmount || 0;

  // Logic: district focus, not total focus
  const deliveryCharge = order.district === "Dhaka"
    ? deliverySettings.insideDhaka
    : order.district === "Self Pickup"
      ? 0
      : deliverySettings.outsideDhaka;

  const handleSaveRemark = async () => {
    setRemarkLoading(true);
    const result = await updateOrderRemark(order.id, remarks);
    if (!result.success) {
      alert(result.error || "Failed to update remark");
    } else {
      setIsEditingRemark(false);
      router.refresh();
    }
    setRemarkLoading(false);
  };

  return (
    <div className="space-y-2">
      {/* Action Header */}
      <div className="flex justify-end">
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-all   group"
          >
            <Edit2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            Edit Customer Details
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setFormData({
                  customerName: order.customerName,
                  phone: order.phone,
                  district: order.district,
                  address: order.address,
                  advancePaid: order.advancePaid || 0,
                });
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all   disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Row 1: 50/50 Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-white border border-slate-200 rounded-2xl p-6    transition-shadow duration-300">
        {/* Customer Identity */}
        <div className="rounded-2xl p-6    transition-shadow duration-300">
          <h3 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-[11px] flex items-center gap-2.5 pb-4 border-b border-slate-50">
            <div className="p-1.5 bg-indigo-50 rounded-md">
              <User className="w-4 h-4 text-indigo-500" />
            </div>
            Customer Identity
          </h3>
          <div className="space-y-6">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Full Legal Name</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 font-semibold text-slate-800 transition-all"
                />
              ) : (
                <span className="font-bold text-slate-800 text-lg block">{order.customerName}</span>
              )}
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Contact Phone</span>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 font-semibold text-slate-800 transition-all font-mono"
                />
              ) : (
                <a href={`tel:${order.phone}`} className="inline-flex items-center gap-3 text-slate-700 hover:text-indigo-600 transition-colors font-semibold py-2 px-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-indigo-100">
                  <Phone className="w-4 h-4 text-indigo-400" />
                  {order.phone}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Shipping Coordinates */}
        <div className=" p-6    transition-shadow duration-300">
          <h3 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-[11px] flex items-center gap-2.5 pb-4 border-b border-slate-50">
            <div className="p-1.5 bg-rose-50 rounded-md">
              <MapPin className="w-4 h-4 text-rose-500" />
            </div>
            Shipping Coordinates
          </h3>
          <div className="space-y-5">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">District</span>
              {isEditing ? (
                <CustomSelect
                  options={[
                    "Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogra", "Brahmanbaria", "Chandpur", "Chapainawabganj", "Chattogram", "Chuadanga", "Comilla", "Cox's Bazar", "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet", "Tangail", "Thakurgaon", "Self Pickup"
                  ].sort().map(d => ({ value: d, label: d }))}
                  value={formData.district}
                  onChange={(val) => setFormData({ ...formData, district: val })}
                  searchable={true}
                />
              ) : (
                <span className="inline-block bg-[#800020] text-[#FFD700] px-4 py-1.5 rounded-md text-[10px] font-black tracking-[0.2em] uppercase   border border-[#600010]">
                  {order.district}
                </span>
              )}
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">Address</span>
              {isEditing ? (
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 text-slate-700 resize-none font-medium transition-all"
                />
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 font-medium leading-relaxed">
                  {order.address}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Financial Breakdown & Physical Artifacts */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2">

        {/* Financial Breakdown */}
        <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-6    transition-shadow duration-300">
          <h3 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-[11px] flex items-center gap-2.5 pb-4 border-b border-slate-50">
            <div className="p-1.5 bg-emerald-50 rounded-md">
              <Wallet className="w-4 h-4 text-emerald-500" />
            </div>
            Financial Breakdown
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium whitespace-nowrap">Subtotal</span>
              <span className="font-bold text-slate-800">{formatBDT(baseSubtotal)}</span>
            </div>
            {totalDTFCost > 0 && (
              <div className="flex justify-between items-center text-sm text-indigo-600">
                <span className="font-medium">DTF Printing Cost</span>
                <span className="font-bold">{formatBDT(totalDTFCost)}</span>
              </div>
            )}
            {discount > 0 && !isEditing && (
              <div className="flex justify-between items-center text-sm text-red-500">
                <span className="font-medium">Discount {order.couponCode && `(${order.couponCode})`}</span>
                <span className="font-bold">-{formatBDT(discount)}</span>
              </div>
            )}

            {isEditing && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div>
                  <span className="block text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider">Manual Discount</span>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">৳</span>
                    <input
                      type="number"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-400 font-bold text-indigo-600 transition-all font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Delivery Charge</span>
              <span className="font-bold text-slate-800">{formatBDT(deliveryCharge)}</span>
            </div>

            <div className="pt-4 border-t-2 border-dashed border-slate-100 flex justify-between items-center">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em]">Grand Total</span>
              <span className="text-2xl font-black text-slate-900 tracking-tighter">{formatBDT(order.totalAmount)}</span>
            </div>

            <div className="space-y-6 ">
              <div className="">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Advance Paid</span>
                  <span>
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-300 text-xs">৳</span>
                        <input
                          type="number"
                          value={formData.advancePaid}
                          onChange={(e) => setFormData({ ...formData, advancePaid: parseFloat(e.target.value) || 0 })}
                          className="w-32 bg-white border border-slate-200 rounded-lg pl-6 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 font-black text-slate-900 text-sm transition-all"
                        />
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-xl font-bold text-slate-900 block tracking-tight">
                        <Minus className="w-4 h-4 text-slate-500" /> {formatBDT(order.advancePaid || 0)}
                      </span>
                    )}
                  </span>
                </div>

              </div>

              <div className="border-b border-slate-200  flex justify-between items-center py-6 border-t border-slate-200 border-dashed">
                <span className="block text-sm uppercase font-black text-slate-400 mb-1.5 tracking-widest">Total Due</span>
                <span className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                  {formatBDT(order.totalAmount - (order.advancePaid || 0))}
                </span>
              </div>
            </div>

            {/* bKash Payment Details */}
            {order.bkashNumber && (
              <div className="mt-4 ">
                <h3 className="font-bold text-slate-900 mb-6 uppercase tracking-widest text-[11px] flex items-center gap-2.5 pb-4 border-b border-slate-50">
                  <div className="p-1.5 bg-emerald-50 rounded-md">
                    <VerifiedIcon className="w-4 h-4 text-emerald-500" />
                  </div>
                  Manual Verification
                </h3>
                <div className="space-y-4">
                  <div className="flex  justify-between gap-1 border-b border-slate-100 pb-3">
                    <span className="text-[11px] text-slate-400 font-black uppercase tracking-widest">Customer bKash No.</span>
                    <span className="text-sm font-black text-slate-900 font-mono tracking-tighter">{order.bkashNumber}</span>
                  </div>
                  <div className="flex  justify-between gap-1">
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Transaction ID</span>
                    <span className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center justify-between">
                      {order.bkashTrxId}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Physical Artifacts (Order Items) */}
        <div className="col-span-3 bg-white border border-slate-200 rounded-2xl overflow-hidden    transition-shadow duration-300">
          <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/40">
            <h3 className="font-bold text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-50 rounded-md">
                <Package className="w-4 h-4 text-amber-500" />
              </div>
              Physical Artifacts ({order.items.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto custom-scrollbar">
            {order.items.map((item: any) => (
              <div key={item.id} className="p-5 flex gap-4 hover:bg-slate-50/50 transition-colors group">
                <div className="w-16 h-20 relative bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0 group-hover:scale-[1.02] transition-transform">
                  {item.product.images[0] && (
                    <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <h4 className="font-bold text-slate-900 text-sm leading-tight truncate mb-2">
                    {item.product.name}
                  </h4>
                  <div className="flex flex-col gap-1.5 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono bg-slate-900 text-[10px] px-2 py-0.5 rounded font-black text-white tracking-widest">
                        {item.size}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">
                        Qty: {item.quantity}
                      </span>
                    </div>

                    {item.requiresPrint && (
                      <div className="flex flex-col gap-1 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/50">
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest leading-none">Jersey Customization</span>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-indigo-700 uppercase">{item.printName} <span className="text-indigo-400">#{item.printNumber}</span></span>
                          <span className="text-[10px] font-bold text-indigo-600">+{formatBDT(item.printCost * item.quantity)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-1">
                    <span className="text-xs text-slate-400 font-medium">@ {formatBDT(item.price)}</span>
                    <span className="font-bold text-slate-900 text-sm">{formatBDT((item.price + (item.requiresPrint ? item.printCost : 0)) * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Administrative Remarks */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
          <h3 className="font-bold text-slate-900 uppercase tracking-widest text-[11px] flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-50 rounded-md">
              <StickyNote className="w-4 h-4 text-blue-500" />
            </div>
            Administrative Remarks
          </h3>

          {!isEditingRemark ? (
            <button
              onClick={() => setIsEditingRemark(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-600 rounded-md hover:text-indigo-600 hover:border-indigo-200 transition-all group"
            >
              <Edit2 className="w-3 h-3 group-hover:scale-110 transition-transform" />
              Edit Remark
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveRemark}
                disabled={remarkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-all disabled:opacity-50 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                {remarkLoading ? "Saving..." : "Save"}
              </button>
              <button
                onClick={() => {
                  setIsEditingRemark(false);
                  setRemarks(order.remarks || "");
                }}
                disabled={remarkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50 transition-all disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            </div>
          )}
        </div>

        {isEditingRemark ? (
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Add internal notes about this order, tracking info, or customer communication history..."
            rows={4}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 text-slate-700 resize-none font-medium transition-all text-sm leading-relaxed"
            autoFocus
          />
        ) : (
          <div
            onClick={() => setIsEditingRemark(true)}
            className="w-full min-h-[100px] bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-slate-700 text-sm leading-relaxed cursor-pointer hover:bg-slate-50 transition-colors"
          >
            {order.remarks ? (
              <p className="whitespace-pre-wrap font-medium">{order.remarks}</p>
            ) : (
              <p className="text-slate-400 italic">No internal remarks added yet. Click to add notes...</p>
            )}
          </div>
        )}


      </div>
    </div>
  );
}
