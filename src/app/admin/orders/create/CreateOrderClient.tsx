"use client";

import { useState, useMemo, useTransition } from "react";
import { Search, Plus, Trash2, User, Phone, MapPin, ShoppingBag, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { createAdminOrder } from "../../actions";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  price: number;
  variants: { id: string; size: string; stock: number }[];
  discount?: { value: number; discountType: "FLAT" | "PERCENTAGE" } | null;
}

interface OrderItem {
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  price: number; // Unit price at calculation
  stock: number;
}

export default function CreateOrderClient({ products }: { products: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Customer Info
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [address, setAddress] = useState("");
  const [advancePaid, setAdvancePaid] = useState(0);
  const [remarks, setRemarks] = useState("");

  // Items in current order
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Product Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    if (!searchQuery || selectedProductId === products.find(p => p.name === searchQuery)?.id) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.team?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8);
  }, [products, searchQuery, selectedProductId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredProducts.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % filteredProducts.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex(prev => (prev - 1 + filteredProducts.length) % filteredProducts.length);
    } else if (e.key === "Enter" && focusedIndex >= 0) {
      e.preventDefault();
      const p = filteredProducts[focusedIndex];
      setSelectedProductId(p.id);
      setSearchQuery(p.name);
      setFocusedIndex(-1);
    }
  };

  // Selected Product Details
  const selectedProduct = useMemo(() =>
    products.find(p => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Available sizes for selected product
  const availableSizes = useMemo(() =>
    selectedProduct?.variants || [],
    [selectedProduct]
  );

  // Calculate unit price with discount
  const getDiscountedPrice = (product: Product) => {
    if (!product.discount) return product.price;
    if (product.discount.discountType === "PERCENTAGE") {
      return product.price - (product.price * product.discount.value) / 100;
    }
    return product.price - product.discount.value;
  };

  const addToOrder = () => {
    if (!selectedProduct || !selectedSize) return;

    const variant = selectedProduct.variants.find((v: any) => v.size === selectedSize);
    if (!variant) return;

    const unitPrice = getDiscountedPrice(selectedProduct);

    // Check if item already exists
    const existingIndex = orderItems.findIndex(
      item => item.productId === selectedProductId && item.size === selectedSize
    );

    if (existingIndex > -1) {
      const updatedItems = [...orderItems];
      updatedItems[existingIndex].quantity += quantity;
      setOrderItems(updatedItems);
    } else {
      setOrderItems([...orderItems, {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        size: selectedSize,
        quantity: quantity,
        price: unitPrice,
        stock: variant.stock
      }]);
    }

    // Reset selection for next item
    setSearchQuery("");
    setSelectedProductId("");
    setSelectedSize("");
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(() =>
    orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    [orderItems]
  );

  const deliveryCharge = district === "Dhaka" ? 80 : 150;
  const totalAmount = subtotal + deliveryCharge;

  const handleSubmit = () => {
    if (!customerName || !phone || !address || orderItems.length === 0) {
      return alert("Please fill in all customer details and add at least one item.");
    }

    startTransition(async () => {
      try {
        const res = await createAdminOrder({
          customerName,
          phone,
          district,
          address,
          totalAmount,
          advancePaid,
          remarks,
          items: orderItems.map(item => ({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
            price: item.price
          }))
        });

        if (res.success) {
          router.push(`/admin/orders`);
        } else {
          alert(res.error || "Failed to create order.");
        }
      } catch (error) {
        console.error(error);
        alert("An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Form & Item Selection */}
      <div className="lg:col-span-2 space-y-6">

        {/* Customer Details Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Customer Information</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Enter name"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">District</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                >
                  <option value="Dhaka">Dhaka (Inside)</option>
                  <option value="Outside Dhaka">Outside Dhaka</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5 ">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Address</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Village, Post, Thana, District"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Advance Paid (BDT)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">৳</span>
                <input
                  type="number"
                  value={advancePaid}
                  onChange={e => setAdvancePaid(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-4 py-2 bg-red-50/50 border border-red-100 rounded-lg text-sm font-bold text-red-600 focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Administrative Remarks</label>
              <textarea
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                placeholder="Add any internal notes, packaging instructions, or customer requests..."
                rows={3}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Product Selection Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Add Products</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 items-start gap-4">
              {/* Product Search */}
              <div className="md:col-span-5 relative">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Search Product</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 font-bold" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      setFocusedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search name, team, or category..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
                {/* Search Results Dropdown */}
                {filteredProducts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="max-h-[150px] overflow-y-auto custom-scrollbar">
                      {filteredProducts.map((p, idx) => (
                        <button
                          key={p.id}
                          type="button"
                          onMouseEnter={() => setFocusedIndex(idx)}
                          onClick={() => {
                            setSelectedProductId(p.id);
                            setSearchQuery(p.name);
                            setFocusedIndex(-1);
                          }}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b last:border-0 border-slate-50 ${focusedIndex === idx ? "bg-indigo-50" : "hover:bg-slate-50"
                            }`}
                        >
                          <div className="w-10 h-10 rounded bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                            {p.images?.[0] ? (
                              <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">NO IMG</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-800 truncate">{p.name}</span>
                              <span className="text-sm font-mono font-black text-indigo-600">৳{p.price.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight bg-slate-100 px-1.5 py-0.5 rounded leading-none">{p.team || "General"}</span>
                              <span className="text-[10px] text-slate-400 font-medium">| {p.category}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Size Selection */}
              <div className="md:col-span-4">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Size & Stock</label>
                <div className="flex flex-wrap gap-2">
                  {selectedProductId ? (
                    availableSizes.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        disabled={v.stock <= 0}
                        onClick={() => setSelectedSize(v.size)}
                        className={`px-3 py-2 rounded-md border text-xs font-black transition-all ${selectedSize === v.size
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                          : v.stock > 0
                            ? "bg-white border-slate-200 text-slate-700 hover:border-indigo-400"
                            : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                          }`}
                      >
                        {v.size}
                        <span className={`ml-1 text-[9px] ${selectedSize === v.size ? "text-indigo-200" : "text-slate-400"}`}>
                          ({v.stock})
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="h-9 flex items-center text-slate-400 text-xs italic">Select a product first</div>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Add Button */}
              <div className="md:col-span-1 ">
                <h1 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Add</h1>
                <button
                  type="button"
                  onClick={addToOrder}
                  disabled={!selectedProductId || !selectedSize}
                  className="w-full h-[38px] flex items-center justify-center bg-slate-900 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all shadow-sm"
                >

                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Selected Items Table */}
            <div className="border border-slate-100 rounded-lg overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5">Product</th>
                    <th className="px-4 py-2.5 text-center">Size</th>
                    <th className="px-4 py-2.5 text-center">Quantity</th>
                    <th className="px-4 py-2.5 text-right">Unit Price</th>
                    <th className="px-4 py-2.5 text-right flex justify-end"><Trash2 className="w-3.5 h-3.5" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700">
                  {orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No products added yet.</td>
                    </tr>
                  ) : (
                    orderItems.map((item, idx) => (
                      <tr key={`${item.productId}-${item.size}`} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-bold">{item.productName}</td>
                        <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black">{item.size}</span></td>
                        <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono">৳{item.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => removeItem(idx)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Order Summary & Action */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden sticky top-6">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest">Order Summary</h2>
            <ShoppingBag className="w-4 h-4 text-gold" />
          </div>

          <div className="p-6 space-y-4">
            <div className="flex justify-between text-sm text-slate-500">
              <span>Subtotal ({orderItems.length} items)</span>
              <span className="font-mono font-bold text-slate-800">৳{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Delivery Charge</span>
              <span className="font-mono font-bold text-slate-800">৳{deliveryCharge.toLocaleString()}</span>
            </div>

            <div className="pt-4 border-t border-dashed border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Grand Total</span>
                <span className="text-lg font-bold text-slate-800 font-mono">
                  ৳{totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-red-500 uppercase tracking-tighter">Advance Paid</span>
                <span className="text-lg font-bold text-red-500 font-mono">
                  - ৳{advancePaid.toLocaleString()}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                   <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Net Due</span>
                   <span className="text-2xl font-black text-indigo-600 font-mono tracking-tighter">
                      ৳{(totalAmount - advancePaid).toLocaleString()}
                   </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium pt-1">Inclusive of all applicable taxes and charges</p>
            </div>

            <div className="pt-6 space-y-3">
              <button
                onClick={handleSubmit}
                disabled={isPending || orderItems.length === 0}
                className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-200 hover:bg-black hover:shadow-black/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed group"
              >
                {isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    CREATE & CONFIRM ORDER
                  </>
                )}
              </button>

              <Link
                href="/admin/orders"
                className="w-full h-12 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Discard & Back to List
              </Link>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>SYSTEM ONLINE & READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
