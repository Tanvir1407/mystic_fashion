"use client";

import { useState } from "react";
import {
  Edit2, Check, X, Package, Trash2, Plus, Copy,
  Compass, CheckCircle2, Truck, PackageCheck, Printer,
  AlertCircle, Minus, VerifiedIcon, Loader2,
} from "lucide-react";
import { updateOrderDetails, updateOrderRemark } from "../../actions";
import { useRouter } from "next/navigation";
import UploadedImage from "@/components/UploadedImage";
import { CustomSelect } from "@/components/CustomSelect";
import { formatBDT, roundPrice } from "@/utils/formatPrice";

export default function OrderDetailsClient({
  order,
  deliverySettings,
  products = [],
  pathaoInfo = null,
}: {
  order: any;
  deliverySettings: any;
  products?: any[];
  pathaoInfo?: any;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remarkLoading, setRemarkLoading] = useState(false);
  const [isEditingRemark, setIsEditingRemark] = useState(false);
  const [remarks, setRemarks] = useState(order.remarks || "");
  const [copied, setCopied] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  const [formData, setFormData] = useState({
    customerName: order.customerName,
    phone: order.phone,
    district: order.district,
    address: order.address,
    advancePaid: order.advancePaid || 0,
    discountAmount: order.discountAmount || 0,
    items: order.items || [],
    deliveryCharge: order.deliveryCharge || 0,
  });

  const [newProductData, setNewProductData] = useState({
    productId: "",
    size: "",
    quantity: 1,
    requiresPrint: false,
    printName: "",
    printNumber: "",
    printCost: 300,
  });

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
      deliveryCharge: formData.deliveryCharge,
      isStorePickup: order.isStorePickup,
      items: formData.items.map((i: any) => ({
        id: i.id,
        productId: i.productId,
        size: i.size,
        quantity: i.quantity,
        price: i.price,
        requiresPrint: i.requiresPrint,
        printName: i.printName,
        printNumber: i.printNumber,
        printCost: i.printCost,
      })),
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

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsAddingProduct(false);
    setFormData({
      customerName: order.customerName,
      phone: order.phone,
      district: order.district,
      address: order.address,
      advancePaid: order.advancePaid || 0,
      discountAmount: order.discountAmount || 0,
      items: order.items || [],
      deliveryCharge: order.deliveryCharge || 0,
    });
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

  const updateItemQuantity = (index: number, delta: number) => {
    const newItems = [...formData.items];
    const newQty = newItems[index].quantity + delta;
    if (newQty > 0) { newItems[index].quantity = newQty; setFormData({ ...formData, items: newItems }); }
  };

  const removeItem = (index: number) => {
    setFormData({ ...formData, items: formData.items.filter((_: any, i: number) => i !== index) });
  };

  const handleAddNewProduct = () => {
    if (!newProductData.productId || !newProductData.size) { alert("Please select a product and size."); return; }
    const product = products.find((p) => p.id === newProductData.productId);
    let price = product.price;
    if (product.discount) {
      price = product.discount.discountType === "PERCENTAGE"
        ? roundPrice(price - price * (product.discount.value / 100))
        : roundPrice(price - product.discount.value);
    }
    setFormData({
      ...formData,
      items: [...formData.items, {
        id: `new-${Date.now()}`, productId: product.id, product,
        size: newProductData.size, quantity: newProductData.quantity, price,
        requiresPrint: newProductData.requiresPrint,
        printName: newProductData.requiresPrint ? newProductData.printName : "",
        printNumber: newProductData.requiresPrint ? newProductData.printNumber : "",
        printCost: newProductData.requiresPrint ? newProductData.printCost : 0,
      }],
    });
    setIsAddingProduct(false);
    setNewProductData({ productId: "", size: "", quantity: 1, requiresPrint: false, printName: "", printNumber: "", printCost: 300 });
  };

  // Financial calculations
  const baseSubtotal = formData.items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
  const totalDTFCost = formData.items.reduce((acc: number, item: any) => acc + (item.requiresPrint ? item.printCost * item.quantity : 0), 0);
  const discount = formData.discountAmount || 0;
  const deliveryCharge = order.isStorePickup
    ? (isEditing ? formData.deliveryCharge : order.deliveryCharge)
    : formData.district === "Dhaka"
      ? deliverySettings.insideDhaka
      : formData.district === "Self Pickup"
        ? 0
        : deliverySettings.outsideDhaka;
  const currentTotal = baseSubtotal + totalDTFCost + deliveryCharge - discount;
  const displayTotal = isEditing ? currentTotal : order.totalAmount;
  const totalDue = displayTotal - (formData.advancePaid || 0);

  // Status tracker
  const STATUS_STEPS = [
    { statusKey: "PENDING", title: "Order Placed", icon: Package },
    { statusKey: "CONFIRMED", title: "Confirmed", icon: CheckCircle2 },
    { statusKey: "PRINTING", title: "Printing", icon: Printer },
    { statusKey: "PACKAGING", title: "Packaged", icon: PackageCheck },
    { statusKey: "SHIPPED", title: "Shipped", icon: Truck },
    { statusKey: "DELIVERED", title: "Delivered", icon: Check },
  ];
  const STATUS_ORDER = ["PENDING", "CONFIRMED", "PRINTING", "PACKAGING", "SHIPPED", "DELIVERED"];
  const isSpecial = order.status === "CANCELLED" || order.status === "RETURNED";
  const currentIndex = STATUS_ORDER.indexOf(order.status);
  const hasPrint = order.items?.some((i: any) => i.requiresPrint);
  const filteredSteps = STATUS_STEPS.filter((s) => s.statusKey !== "PRINTING" || hasPrint || order.status === "PRINTING");

  const pathaoStatus = pathaoInfo?.order_status || pathaoInfo?.order_status_slug || null;
  const pathaoStatusLower = (pathaoStatus || "").toLowerCase();

  const DISTRICTS = ["Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogra", "Brahmanbaria", "Chandpur", "Chapainawabganj", "Chattogram", "Chuadanga", "Comilla", "Cox's Bazar", "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet", "Tangail", "Thakurgaon", "Self Pickup"].sort();

  return (
    <div className="space-y-4">
      {/* Edit Mode Action Bar */}
      {isEditing && (
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-xs font-semibold text-amber-700">You are in edit mode — make changes and save.</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {loading ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Pathao Consignment ID */}
      {order.pathaoConsignmentId && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 px-4 py-2.5 rounded-xl">
          <div>
            <span className="block text-[10px] uppercase font-bold text-indigo-400 tracking-wider mb-0.5">Pathao Consignment ID</span>
            <span className="text-sm font-black text-indigo-700 tracking-widest font-mono">{order.pathaoConsignmentId}</span>
          </div>
          <button
            onClick={() => handleCopy(order.pathaoConsignmentId)}
            className="p-2 bg-white border border-indigo-200 rounded-lg text-indigo-500 hover:border-indigo-300 transition-all shadow-sm"
            title="Copy"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Left Main Column ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Products Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="px-5 py-4 border-b border-slate-100 rounded-t-xl flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Products
                <span className="text-slate-400 font-normal ml-1.5">({formData.items.length})</span>
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100">
              {formData.items.map((item: any, index: number) => (
                <div key={item.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  {/* Product Image */}
                  <div className="w-14 h-16 relative bg-slate-100 rounded-lg overflow-hidden border border-slate-150 shrink-0">
                    {item.product?.images?.[0] ? (
                      <UploadedImage src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.product?.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded tracking-widest">{item.size}</span>
                      <span className="text-xs text-slate-500">@ {formatBDT(item.price)}</span>
                      {item.requiresPrint && (
                        <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Print: {item.printName} #{item.printNumber}
                        </span>
                      )}
                    </div>
                    {item.requiresPrint && (
                      <p className="text-[10px] text-indigo-500 font-medium mt-0.5">
                        + {formatBDT(item.printCost * item.quantity)} DTF cost
                      </p>
                    )}
                  </div>

                  {/* Qty + Price */}
                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {isEditing ? (
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                        <button onClick={() => updateItemQuantity(index, -1)} className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-colors">−</button>
                        <span className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-slate-50 min-w-[32px] text-center">{item.quantity}</span>
                        <button onClick={() => updateItemQuantity(index, 1)} className="px-2.5 py-1.5 hover:bg-slate-100 text-slate-600 font-bold text-sm transition-colors">+</button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-600">Qty: {item.quantity}</span>
                    )}
                    <span className="text-sm font-bold text-slate-900">
                      {formatBDT((item.price + (item.requiresPrint ? item.printCost : 0)) * item.quantity)}
                    </span>
                    {isEditing && (
                      <button onClick={() => removeItem(index)} className="text-[10px] font-bold text-red-500 hover:text-red-700 flex items-center gap-0.5 transition-colors">
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Product (edit mode) */}
            {isEditing && (
              <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50">
                {!isAddingProduct ? (
                  <button
                    onClick={() => setIsAddingProduct(true)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:border-slate-400 hover:text-slate-700 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                ) : (
                  <div className="space-y-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-800">Add New Product</h4>
                      <button onClick={() => setIsAddingProduct(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Product</label>
                      <CustomSelect options={products.map((p) => ({ value: p.id, label: p.name }))} value={newProductData.productId} onChange={(val) => setNewProductData({ ...newProductData, productId: val })} searchable />
                    </div>
                    {newProductData.productId && (
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Size</label>
                        <CustomSelect options={(products.find((p) => p.id === newProductData.productId)?.variants || []).map((v: any) => ({ value: v.size, label: `${v.size} (Stock: ${v.stock})` }))} value={newProductData.size} onChange={(val) => setNewProductData({ ...newProductData, size: val })} openUpwards />
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Quantity</label>
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden w-fit bg-white">
                        <button onClick={() => setNewProductData({ ...newProductData, quantity: Math.max(1, newProductData.quantity - 1) })} className="px-3 py-1.5 hover:bg-slate-100 font-bold text-slate-600">−</button>
                        <span className="px-4 py-1.5 text-xs font-bold bg-slate-50">{newProductData.quantity}</span>
                        <button onClick={() => setNewProductData({ ...newProductData, quantity: newProductData.quantity + 1 })} className="px-3 py-1.5 hover:bg-slate-100 font-bold text-slate-600">+</button>
                      </div>
                    </div>
                    <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                        <input type="checkbox" checked={newProductData.requiresPrint} onChange={(e) => setNewProductData({ ...newProductData, requiresPrint: e.target.checked })} className="rounded text-indigo-600" />
                        Jersey Customization (Name & Number)
                      </label>
                      {newProductData.requiresPrint && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <input type="text" placeholder="Print Name" value={newProductData.printName} onChange={(e) => setNewProductData({ ...newProductData, printName: e.target.value })} className="text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400" />
                          <input type="text" placeholder="Number" value={newProductData.printNumber} onChange={(e) => setNewProductData({ ...newProductData, printNumber: e.target.value })} className="text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400" />
                        </div>
                      )}
                    </div>
                    <button onClick={handleAddNewProduct} className="w-full py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Add to Order
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Summary Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">Order Summary</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {/* Subtotal */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">{formData.items.length} item{formData.items.length !== 1 ? "s" : ""}</span>
                <span className="font-semibold text-slate-800">{formatBDT(baseSubtotal)}</span>
              </div>

              {/* DTF Cost */}
              {totalDTFCost > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-indigo-500">DTF Printing</span>
                  <span className="font-semibold text-indigo-600">{formatBDT(totalDTFCost)}</span>
                </div>
              )}

              {/* Discount */}
              {!isEditing && discount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Discount {order.couponCode && <span className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded ml-1">{order.couponCode}</span>}</span>
                  <span className="font-semibold text-red-500">−{formatBDT(discount)}</span>
                </div>
              )}

              {/* Discount edit mode */}
              {isEditing && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Manual Discount</span>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">৳</span>
                    <input
                      type="number"
                      value={formData.discountAmount}
                      onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || 0 })}
                      className="w-28 pl-6 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-red-500 text-right focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              )}

              {/* Delivery */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Shipping {!order.isStorePickup && formData.district && <span className="text-[10px] text-slate-400 ml-1">({formData.district})</span>}</span>
                {isEditing && order.isStorePickup ? (
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">৳</span>
                    <input
                      type="number"
                      value={formData.deliveryCharge}
                      onChange={(e) => setFormData({ ...formData, deliveryCharge: parseFloat(e.target.value) || 0 })}
                      className="w-28 pl-6 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-right focus:outline-none focus:border-slate-400"
                    />
                  </div>
                ) : (
                  <span className="font-semibold text-slate-800">{formatBDT(deliveryCharge)}</span>
                )}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-900">Total</span>
                <span className="text-sm font-bold text-slate-900">{formatBDT(displayTotal)}</span>
              </div>

              {/* Advance Paid */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Advance Paid</span>
                {isEditing ? (
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">৳</span>
                    <input
                      type="number"
                      value={formData.advancePaid}
                      onChange={(e) => setFormData({ ...formData, advancePaid: parseFloat(e.target.value) || 0 })}
                      className="w-28 pl-6 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-emerald-600 text-right focus:outline-none focus:border-slate-400"
                    />
                  </div>
                ) : (
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <Minus className="w-3 h-3" /> {formatBDT(order.advancePaid || 0)}
                  </span>
                )}
              </div>

              {/* Payment Due */}
              <div className="flex justify-between items-center pt-3 border-t-2 border-dashed border-slate-200">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Payment Due</span>
                <span className={`text-2xl font-black tracking-tighter tabular-nums ${totalDue > 0 ? "text-rose-500" : "text-emerald-500"}`}>
                  {formatBDT(totalDue)}
                </span>
              </div>

              {/* bKash Payment Verification */}
              {order.bkashNumber && (
                <div className="mt-2 pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <VerifiedIcon className="w-3.5 h-3.5 text-emerald-500" /> bKash Verification
                  </p>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Customer bKash No.</span>
                    <span className="font-bold font-mono text-slate-800">{order.bkashNumber}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Transaction ID</span>
                    <span className="font-bold font-mono text-slate-800">{order.bkashTrxId}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Shipment Milestone Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-violet-500" />
                Shipment Status
              </h2>
              {order.status === "SHIPPED" && order.pathaoConsignmentId && (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Live</span>
                </div>
              )}
            </div>
            <div className="px-5 py-5">
              {isSpecial ? (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold ${order.status === "CANCELLED" ? "bg-red-50 text-red-700 border border-red-100" : "bg-slate-50 text-slate-700 border border-slate-200"}`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Order {order.status}
                </div>
              ) : (
                <div className="relative flex items-start">
                  <div className="absolute top-4 left-0 right-0 h-[2px] bg-slate-100" style={{ zIndex: 0 }} />
                  <div className="flex w-full relative">
                    {filteredSteps.map((step) => {
                      const stepIdx = STATUS_ORDER.indexOf(step.statusKey);
                      const isCompleted = stepIdx < currentIndex;
                      const isActive = stepIdx === currentIndex;
                      const showPathao = step.statusKey === "SHIPPED" && order.pathaoConsignmentId;
                      const Icon = step.icon;
                      return (
                        <div key={step.statusKey} className="flex flex-col items-center flex-1 min-w-0">
                          <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${isActive ? "bg-violet-600 border-violet-600 text-white ring-4 ring-violet-100 shadow-lg scale-110" : isCompleted ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" : "bg-white border-slate-200 text-slate-400"}`}>
                            {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : <Icon className="w-3.5 h-3.5 stroke-[2.5px]" />}
                          </div>
                          <span className={`mt-2 text-[10px] font-bold text-center leading-tight px-0.5 uppercase tracking-wide ${isActive ? "text-violet-600" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                            {step.title}
                          </span>
                          {showPathao && (
                            <div className="mt-1.5 flex flex-col items-center gap-1">
                              {pathaoStatus ? (
                                <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border tracking-wider uppercase ${pathaoStatusLower.includes("delivered") ? "bg-emerald-50 text-emerald-600 border-emerald-200" : pathaoStatusLower.includes("cancel") ? "bg-red-50 text-red-500 border-red-200" : "bg-indigo-50 text-indigo-600 border-indigo-200"}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pathaoStatusLower.includes("delivered") ? "bg-emerald-500" : pathaoStatusLower.includes("cancel") ? "bg-red-500" : "bg-indigo-500"}`} />
                                  {pathaoStatus}
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-400 italic">Syncing…</span>
                              )}
                              {pathaoInfo?.updated_at && (
                                <span className="text-[8px] text-slate-400 text-center leading-tight">
                                  {new Date(pathaoInfo.updated_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-4">

          {/* Notes / Remarks Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Notes</h3>
              {!isEditingRemark ? (
                <button onClick={() => setIsEditingRemark(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveRemark} disabled={remarkLoading} className="text-xs font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1 transition-colors">
                    {remarkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                  <button onClick={() => { setIsEditingRemark(false); setRemarks(order.remarks || ""); }} disabled={remarkLoading} className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors">
                    Cancel
                  </button>
                </div>
              )}
            </div>
            <div className="p-4">
              {isEditingRemark ? (
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Add internal notes about this order..."
                  rows={4}
                  autoFocus
                  className="w-full text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:border-slate-400 resize-none leading-relaxed"
                />
              ) : order.remarks ? (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap cursor-pointer hover:text-slate-800" onClick={() => setIsEditingRemark(true)}>
                  {order.remarks}
                </p>
              ) : (
                <p className="text-xs text-slate-400 italic cursor-pointer hover:text-slate-500" onClick={() => setIsEditingRemark(true)}>
                  No internal notes. Click to add...
                </p>
              )}
            </div>
          </div>

          {/* Customer Info Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Customer info</h3>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
            <div className="p-4 space-y-3">
              {isEditing ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Name</label>
                    <input
                      type="text"
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-800 font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>
                  <a href={`tel:${order.phone}`} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors block">
                    {order.phone}
                  </a>
                </>
              )}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Created by</span>
                {order.createdBy ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg">👤 {order.createdBy.username}</span>
                ) : order.orderSource === "eCommerce" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg">🌐 eCommerce</span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-lg">👤 Salesman</span>
                )}
              </div>
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="px-4 py-3.5 border-b border-slate-100 rounded-t-xl flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Shipping address</h3>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
            <div className="p-4 space-y-3">
              {isEditing ? (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">District</label>
                    <CustomSelect
                      options={DISTRICTS.map((d) => ({ value: d, label: d }))}
                      value={formData.district}
                      onChange={(val) => setFormData({ ...formData, district: val })}
                      searchable
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={3}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700 resize-none"
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-block bg-[#800020] text-[#FFD700] px-3 py-1 rounded text-[10px] font-black tracking-wider uppercase border border-[#600010]">
                      {order.district}
                    </span>
                    {order.isStorePickup && (
                      <span className="text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded uppercase tracking-wider">🏪 Store Pickup</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{order.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Source / Exchange Tag Card (if applicable) */}
          {(order.isExchange || order.exchangeRefOrderId) && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Exchange Order</h3>
              </div>
              <div className="p-4">
                {order.exchangeRefOrderId && (
                  <div className="text-xs text-slate-600 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reference Order</span>
                    <span className="font-mono font-bold text-slate-800">{order.exchangeRefOrderId}</span>
                  </div>
                )}
                {order.exchangeItemNote && (
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{order.exchangeItemNote}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
