"use client";

import { useState } from "react";
import { User, MapPin, Phone, Edit2, Check, X, Package, Wallet, StickyNote, Save, Minus, VerifiedIcon, Trash2, Plus, Copy } from "lucide-react";
import { updateOrderDetails, updateOrderRemark } from "../../actions";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CustomSelect } from "@/components/CustomSelect";

export default function OrderDetailsClient({ order, deliverySettings, products = [] }: { order: any; deliverySettings: any; products?: any[] }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remarkLoading, setRemarkLoading] = useState(false);
  const [isEditingRemark, setIsEditingRemark] = useState(false);
  const [remarks, setRemarks] = useState(order.remarks || "");
  const [formData, setFormData] = useState({
    customerName: order.customerName,
    phone: order.phone,
    district: order.district,
    address: order.address,
    advancePaid: order.advancePaid || 0,
    discountAmount: order.discountAmount || 0,
    items: order.items || [],
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductData, setNewProductData] = useState({
    productId: "",
    size: "",
    quantity: 1,
    requiresPrint: false,
    printName: "",
    printNumber: "",
    printCost: 300,
  });

  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    setLoading(true);
    const result = await updateOrderDetails(order.id, {
      customerName: formData.customerName,
      phone: formData.phone,
      district: formData.district,
      address: formData.address,
      advancePaid: formData.advancePaid,
      discountAmount: formData.discountAmount,
      items: formData.items.map((i: any) => ({
        id: i.id,
        productId: i.productId,
        size: i.size,
        quantity: i.quantity,
        price: i.price,
        requiresPrint: i.requiresPrint,
        printName: i.printName,
        printNumber: i.printNumber,
        printCost: i.printCost
      }))
    });
    if (result.success) {
      setIsEditing(false);
      setIsAddingProduct(false);
      router.refresh();
    } else {
      alert(result.error || "Failed to update order");
    }
    setLoading(false);
  };

  const formatBDT = (price: number) => {
    return price === 0 ? "Free" : `৳${price.toLocaleString("en-IN")}`;
  };

  const baseSubtotal = formData.items.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
  const totalDTFCost = formData.items.reduce((acc: number, item: any) => acc + (item.requiresPrint ? item.printCost * item.quantity : 0), 0);
  const discount = formData.discountAmount || 0;

  // Logic: district focus, not total focus
  const deliveryCharge = formData.district === "Dhaka"
    ? deliverySettings.insideDhaka
    : formData.district === "Self Pickup"
      ? 0
      : deliverySettings.outsideDhaka;

  const currentTotalAmount = (baseSubtotal + totalDTFCost + deliveryCharge) - discount;

  const updateItemQuantity = (index: number, delta: number) => {
    const newItems = [...formData.items];
    const newQuantity = newItems[index].quantity + delta;
    if (newQuantity > 0) {
      newItems[index].quantity = newQuantity;
      setFormData({ ...formData, items: newItems });
    }
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleAddNewProduct = () => {
    if (!newProductData.productId || !newProductData.size) {
      alert("Please select a product and size.");
      return;
    }
    const product = products.find(p => p.id === newProductData.productId);
    let price = product.price;
    if (product.discount) {
      if (product.discount.discountType === "PERCENTAGE") {
        price = price - (price * (product.discount.value / 100));
      } else {
        price = price - product.discount.value;
      }
    }

    const newItem = {
      id: `new-${Date.now()}`,
      productId: product.id,
      product: product,
      size: newProductData.size,
      quantity: newProductData.quantity,
      price: price,
      requiresPrint: newProductData.requiresPrint,
      printName: newProductData.requiresPrint ? newProductData.printName : "",
      printNumber: newProductData.requiresPrint ? newProductData.printNumber : "",
      printCost: newProductData.requiresPrint ? newProductData.printCost : 0,
    };

    setFormData({ ...formData, items: [...formData.items, newItem] });
    setIsAddingProduct(false);
    setNewProductData({ productId: "", size: "", quantity: 1, requiresPrint: false, printName: "", printNumber: "", printCost: 300 });
  };

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
      <div className="flex justify-between items-end">
        {/* Pathao Consignment ID Section */}
        <>{order.pathaoConsignmentId && (
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 mb-2 tracking-wider">
              Pathao Consignment ID / Tracking Number
            </span>
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100  p-1 px-2 rounded-lg group transition-all hover:bg-indigo-100/50">
              <span className="text-sm font-black text-indigo-700 tracking-widest uppercase font-mono">
                {order.pathaoConsignmentId}
              </span>
              <button
                onClick={() => handleCopy(order.pathaoConsignmentId)}
                className="p-1.5 bg-white border border-indigo-200 rounded-md text-indigo-500 hover:text-indigo-700 hover:border-indigo-300 transition-all shadow-sm active:scale-95"
                title="Copy to Clipboard"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in-50 duration-200" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        )}</>
        <div>
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
                      discountAmount: order.discountAmount || 0,
                      items: order.items || [],
                    });
                    setIsAddingProduct(false);
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
        </div>
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

        {/* Row 3: Administrative Remarks */}
        <div className="col-span-2 px-5">
          <div className="flex items-center justify-between mb-1 pt-4 border-t border-slate-50">
            <h3 className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
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
              className="w-full min-h-[50px] max-h-[150px] overflow-y-auto bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 text-slate-700 text-sm leading-relaxed cursor-pointer hover:bg-slate-50 transition-colors"
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
              <span className="text-sm uppercase font-black text-slate-400 tracking-[0.2em]">Grand Total</span>
              <span className="font-bold text-slate-800">{formatBDT(isEditing ? currentTotalAmount : order.totalAmount)}</span>
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

              <div className=" flex justify-between items-center py-6 border-t border-slate-200 border-dashed">
                <span className="block text-sm uppercase font-black text-slate-400 mb-1.5 tracking-widest">Total Due</span>
                <span className="text-3xl font-bold text-rose-500 tracking-tighter tabular-nums leading-none">
                  {formatBDT((isEditing ? currentTotalAmount : order.totalAmount) - (formData.advancePaid || 0))}
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
            {formData.items.map((item: any, index: number) => (
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
                      {isEditing ? (
                        <div className="flex items-center bg-slate-100 rounded border border-slate-200 overflow-hidden">
                          <button onClick={() => updateItemQuantity(index, -1)} className="px-2 py-0.5 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer font-bold">-</button>
                          <span className="text-[10px] bg-white px-2 py-0.5 font-bold uppercase text-slate-800 min-w-[24px] text-center">{item.quantity}</span>
                          <button onClick={() => updateItemQuantity(index, 1)} className="px-2 py-0.5 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer font-bold">+</button>
                        </div>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">
                          Qty: {item.quantity}
                        </span>
                      )}
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
                  <div className="flex flex-col gap-2 mt-auto pt-2 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">@ {formatBDT(item.price)}</span>
                      <span className="font-bold text-slate-900 text-sm">{formatBDT((item.price + (item.requiresPrint ? item.printCost : 0)) * item.quantity)}</span>
                    </div>
                    {isEditing && (
                      <div className="flex justify-end">
                        <button onClick={() => removeItem(index)} className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors">
                          <Trash2 className="w-3 h-3" /> Remove Item
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {isEditing && (
            <div className="p-5 bg-slate-50 border-t border-slate-100">
              {!isAddingProduct ? (
                <button
                  onClick={() => setIsAddingProduct(true)}
                  className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:bg-slate-100 hover:text-slate-800 hover:border-slate-400 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add Product to Order
                </button>
              ) : (
                <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                    <h4 className="font-bold text-slate-800 text-sm">Add New Product</h4>
                    <button onClick={() => setIsAddingProduct(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Select Product</label>
                      <CustomSelect
                        options={products.map((p) => ({ value: p.id, label: p.name }))}
                        value={newProductData.productId}
                        onChange={(val) => setNewProductData({ ...newProductData, productId: val })}
                        searchable={true}
                      />
                    </div>

                    {newProductData.productId && (
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Select Size</label>
                        <CustomSelect
                          options={(products.find(p => p.id === newProductData.productId)?.variants || []).map((v: any) => ({ value: v.size, label: `${v.size} (Stock: ${v.stock})` }))}
                          value={newProductData.size}
                          onChange={(val) => setNewProductData({ ...newProductData, size: val })}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Quantity</label>
                        <div className="flex items-center bg-slate-100 rounded border border-slate-200 overflow-hidden">
                          <button onClick={() => setNewProductData({ ...newProductData, quantity: Math.max(1, newProductData.quantity - 1) })} className="px-3 py-1.5 hover:bg-slate-200 text-slate-600 font-bold">-</button>
                          <span className="text-xs bg-white px-4 py-1.5 font-bold">{newProductData.quantity}</span>
                          <button onClick={() => setNewProductData({ ...newProductData, quantity: newProductData.quantity + 1 })} className="px-3 py-1.5 hover:bg-slate-200 text-slate-600 font-bold">+</button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newProductData.requiresPrint}
                          onChange={(e) => setNewProductData({ ...newProductData, requiresPrint: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-indigo-500 scale-110"
                        />
                        <span className="text-xs font-bold text-slate-800">Add Jersey Customization (Name & Number)</span>
                      </label>

                      {newProductData.requiresPrint && (
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <input
                              type="text"
                              placeholder="Print Name"
                              value={newProductData.printName}
                              onChange={(e) => setNewProductData({ ...newProductData, printName: e.target.value })}
                              className="w-full text-xs px-3 py-2 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              placeholder="Number"
                              value={newProductData.printNumber}
                              onChange={(e) => setNewProductData({ ...newProductData, printNumber: e.target.value })}
                              className="w-full text-xs px-3 py-2 border border-slate-200 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleAddNewProduct}
                      className="w-full py-2 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors shadow-sm mt-4 inline-flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" /> Add Item to Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
