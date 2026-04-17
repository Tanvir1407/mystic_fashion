"use client";

import { useCartStore } from "@/store/cartStore";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FooterData } from "@/lib/footer";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, X, ChevronDown, Ticket, Loader2, CheckCircle, Tag, Edit2, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { placeOrderAction, validateCoupon } from "./actions";

export default function CheckoutClient({
  deliveryData,
  footerData
}: {
  deliveryData: { insideDhaka: number, outsideDhaka: number },
  footerData: FooterData
}) {
  const { items, getTotalPrice, clearCart, updateItem } = useCartStore();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [districtOpen, setDistrictOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  // Coupon States
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  // DTF Modal State
  const [showDTFModal, setShowDTFModal] = useState(false);
  const [activeItem, setActiveItem] = useState<{ id: string, size: string | undefined } | null>(null);
  const [dtfForm, setDtfForm] = useState({
    type: "messi" as "messi" | "ronaldo" | "neymar" | "custom",
    name: "",
    number: ""
  });

  // Format BDT utility
  const formatBDT = (price: number) => {
    return price === 0 ? "Free" : `৳${price.toLocaleString("en-IN")}`;
  };

  const isDhaka = selectedDistrict === "Dhaka";
  const deliveryFee = selectedDistrict ? (isDhaka ? deliveryData.insideDhaka : deliveryData.outsideDhaka) : 0;

  // Pricing Logic (Excluding DTF from discounts)
  const baseSubtotal = getTotalPrice();
  const totalDTFCost = items.reduce((sum, item) => sum + (item.requiresPrint ? 300 * item.quantity : 0), 0);
  const total = baseSubtotal - couponDiscount + totalDTFCost + (items.length > 0 ? deliveryFee : 0);

  const originalBaseSubtotal = items.reduce((total, item) => total + (item.originalPrice || item.price) * item.quantity, 0);
  const totalItemDiscount = originalBaseSubtotal - baseSubtotal;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsValidating(true);
    setCouponError("");
    setCouponSuccess("");

    const res = await validateCoupon(couponCode, baseSubtotal);
    if (res.success && res.discountAmount !== undefined) {
      setCouponDiscount(res.discountAmount);
      setAppliedCoupon(res.couponCode || couponCode);
      setCouponSuccess(`Coupon applied! Saved ${formatBDT(res.discountAmount)}`);
    } else {
      setCouponError(res.error || "Invalid coupon code.");
      setCouponDiscount(0);
      setAppliedCoupon("");
    }
    setIsValidating(false);
  };

  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("fullName") as string;
    const phone = formData.get("phone") as string;
    const district = formData.get("district") as string;
    const address = formData.get("address") as string;

    if (!fullName || !phone || !district || !address) {
      setErrorMsg("Please fill out all required fields before placing your order.");
      return;
    }

    if (items.length === 0) {
      setErrorMsg("Your cart is empty.");
      return;
    }

    setErrorMsg("");

    startTransition(async () => {
      const result = await placeOrderAction({
        fullName,
        phone,
        district,
        address,
        items,
        totalAmount: total,
        remarks: formData.get("remarks") as string,
        couponCode: appliedCoupon,
        discountAmount: couponDiscount
      });

      if (result.success) {
        setIsSubmitted(true);
        clearCart();
      } else {
        setErrorMsg(result.error || "Failed to finalize order. Please try again or contact support.");
      }
    });
  };

  const handleDTFToggle = (id: string, size: string | undefined, checked: boolean) => {
    if (checked) {
      setActiveItem({ id, size });
      setDtfForm({ type: "messi", name: "Messi", number: "10" });
      setShowDTFModal(true);
    } else {
      updateItem(id, size, {
        requiresPrint: false,
        printName: "",
        printNumber: "",
        printCost: 0
      });
    }
  };

  const saveDTF = () => {
    if (!activeItem) return;
    const { type, name, number } = dtfForm;
    let finalName = name;
    let finalNumber = number;

    if (type === "messi") { finalName = "Messi"; finalNumber = "10"; }
    if (type === "ronaldo") { finalName = "Ronaldo"; finalNumber = "7"; }
    if (type === "neymar") { finalName = "Neymar"; finalNumber = "10"; }

    updateItem(activeItem.id, activeItem.size, {
      requiresPrint: true,
      printName: finalName,
      printNumber: finalNumber,
      printCost: 300
    });
    setShowDTFModal(false);
    setActiveItem(null);
  };

  if (isSubmitted) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <CheckCircle2 className="w-20 h-20 text-green-500 mb-6" />
          <h1 className="text-4xl font-black text-zinc-900 mb-4 tracking-tight">Order Confirmed!</h1>
          <p className="text-zinc-500 max-w-sm mb-8 leading-relaxed">
            Thank you for shopping with Mystic Fashion. Your order has been placed successfully and will be delivered soon.
          </p>
          <Link href="/" className="bg-primary text-white px-8 py-4 rounded-lg font-bold uppercase tracking-widest hover:bg-[#600018] transition-all active:scale-[0.98]">
            Continue Shopping
          </Link>
        </div>
        <Footer config={footerData} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 md:px-0">



        <div className="mb-10 flex justify-between">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mt-6">Checkout</h1>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {/* DTF Instruction Banner (Classic & Modern) */}
        {items.length > 0 && (
          <div className="mb-10 overflow-hidden bg-white border border-slate-200 rounded-lg shadow-sm flex items-stretch animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="w-1.5 bg-primary" />
            <div className="p-5 flex items-center gap-5">

              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.15em] text-zinc-900 leading-none mb-1.5">Elite Customization</h3>
                <p className="text-[13px] font-medium text-zinc-500 leading-relaxed max-w-2xl">
                  Want to customize your jersey? Turn on the <span className="text-primary font-bold italic border-b border-primary/20 pb-0.5">DTF Print toggle</span> below to add your favorite player or your own custom name and number.
                </p>
              </div>
            </div>
          </div>
        )}
        {items.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">🛒</span>
            </div>
            <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
            <p className="text-zinc-500 mb-8 max-w-sm">Looks like you haven't added anything to your cart yet.</p>
            <Link href="/" className="bg-primary text-white px-8 py-4 rounded-lg font-bold uppercase tracking-widest hover:bg-[#600018] transition-all">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10">

            {/* Left Side: Customer Info Form */}
            <div className="w-full lg:w-3/5">
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold uppercase tracking-wide mb-6 pb-4 border-b border-slate-100">Delivery Information</h2>

                <form id="checkout-form" onSubmit={handleSubmit} noValidate className="space-y-6">
                  {/* Name and Phone */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Full Name *</label>
                      <input name="fullName" type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium" placeholder="Enter your full name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Phone Number *</label>
                      <input name="phone" type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium" placeholder="+880 1..." />
                    </div>
                  </div>

                  {/* Address Selection */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Select District *</label>
                      <div className="relative z-20">
                        <div
                          onClick={() => setDistrictOpen(!districtOpen)}
                          className={`w-full bg-slate-50 border ${districtOpen ? 'border-primary ring-1 ring-primary' : 'border-slate-200'} rounded-lg pl-4 pr-12 py-3 ${selectedDistrict ? 'text-zinc-900 font-medium' : 'text-zinc-500'} transition-all cursor-pointer hover:bg-slate-100 flex items-center justify-between`}
                        >
                          <span className="truncate">{selectedDistrict || "-- Select your District --"}</span>
                          <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${districtOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {districtOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setDistrictOpen(false)}></div>
                            <div className="absolute w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                              {[
                                "Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogra", "Brahmanbaria", "Chandpur", "Chapainawabganj", "Chattogram", "Chuadanga", "Comilla", "Cox's Bazar", "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
                              ].sort().map((district) => (
                                <div
                                  key={district}
                                  onClick={() => {
                                    setSelectedDistrict(district);
                                    setDistrictOpen(false);
                                  }}
                                  className={`px-4 py-3 cursor-pointer transition-colors ${selectedDistrict === district ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50 text-zinc-700'}`}
                                >
                                  {district}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        <input type="hidden" name="district" value={selectedDistrict} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Full or Detail Address *</label>
                      <textarea name="address" rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none font-medium" placeholder="House no, Road no, Area etc..." />
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-sm font-bold text-zinc-700">Order Remarks (Optional)</label>
                      <textarea name="remarks" rows={2} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none text-sm" placeholder="Special instructions, gate codes, etc..." />
                    </div>
                  </div>

                </form>
              </div>
            </div>

            {/* Right Side: Order Summary */}
            <div className="w-full lg:w-2/5">
              <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm sticky top-32">
                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 mb-8 pb-4 border-b border-slate-100 flex items-center justify-between">
                  <span>Order Summary</span>
                  <span className="hidden md:block text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{items.length} Items</span>
                </h2>

                <div className="space-y-5 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                  {items.map((item) => (
                    <div key={`${item.id}-${item.size}`} className="flex flex-col gap-3 pb-5 border-b border-slate-50 last:border-0 last:pb-0">
                      <div className="flex gap-4 group">
                        <div className="relative w-16 h-20 bg-slate-50 rounded-lg overflow-hidden flex-shrink-0 border border-slate-100 group-hover:border-slate-300 transition-colors">
                          {item.image && (
                            <Image src={item.image} alt={item.name} fill className="object-cover" />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-0.5">
                          <div>
                            <h4 className="font-bold text-xs uppercase tracking-tight text-slate-800 line-clamp-1 group-hover:text-black transition-colors">{item.name}</h4>
                            <div className="flex items-center gap-3 mt-1.5">
                              {item.size && <span className="text-[10px] font-black uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Size: {item.size}</span>}
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Qty: {item.quantity}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {item.originalPrice && item.originalPrice > item.price && (
                              <span className="text-[10px] font-bold text-slate-300 line-through">৳{item.originalPrice.toLocaleString()}</span>
                            )}
                            <p className="font-black text-slate-900 text-xs">৳{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {/* DTF Toggle Case */}
                      <div className="flex flex-col gap-2 pl-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.requiresPrint}
                            onChange={(e) => handleDTFToggle(item.id, item.size, e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                          />
                          <span className="text-[10px] font-bold text-slate-600 uppercase">Add DTF Print (+৳300)</span>
                        </label>
                        {item.requiresPrint && item.printName && (
                          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div className="flex flex-col">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Print Details</span>
                              <span className="text-[10px] font-black uppercase text-slate-900">{item.printName} ({item.printNumber})</span>
                            </div>
                            <button
                              onClick={() => {
                                setActiveItem({ id: item.id, size: item.size });
                                setDtfForm({ type: "custom", name: item.printName || "", number: item.printNumber || "" });
                                setShowDTFModal(true);
                              }}
                              className="ml-auto text-primary hover:scale-110 transition-transform"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Section (Classic style restored) */}
                <div className="mb-8 border-t border-slate-100 pt-4">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="COUPON CODE"
                        disabled={!!appliedCoupon}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-xs font-black tracking-widest focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none disabled:text-slate-400"
                      />
                    </div>
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon("");
                          setCouponDiscount(0);
                          setCouponCode("");
                          setCouponSuccess("");
                        }}
                        className="px-5 py-3 bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-50 transition-all font-bold"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidating || !couponCode}
                        className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2 font-bold"
                      >
                        {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </button>
                    )}
                  </div>
                  {couponError && <p className="text-[9px] font-bold uppercase text-red-500 mt-3 ml-1 flex items-center gap-1.5"><X className="w-3 h-3" /> {couponError}</p>}
                  {couponSuccess && <p className="text-[9px] font-bold uppercase text-green-600 mt-3 ml-1 flex items-center gap-1.5"><CheckCircle className="w-3 h-3" /> {couponSuccess}</p>}
                </div>

                <div className="space-y-3.5 mb-8">
                  <div className="flex justify-between text-slate-500 text-xs font-bold uppercase tracking-tight">
                    <span>Base Subtotal</span>
                    <span className="text-slate-900">{formatBDT(baseSubtotal)}</span>
                  </div>
                  {totalDTFCost > 0 && (
                    <div className="flex justify-between text-primary text-xs font-bold uppercase tracking-tight">
                      <span>DTF Printing Cost</span>
                      <span>+{formatBDT(totalDTFCost)}</span>
                    </div>
                  )}
                  {totalItemDiscount > 0 && (
                    <div className="flex justify-between text-slate-400 text-xs font-bold uppercase tracking-tight">
                      <span>Item Savings</span>
                      <span>-{formatBDT(totalItemDiscount)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-slate-900 text-xs font-black uppercase tracking-tight">
                      <span className="flex items-center gap-1.5">Coupon ({appliedCoupon})</span>
                      <span>-{formatBDT(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500 text-xs font-bold uppercase tracking-tight">
                    <span>Delivery</span>
                    <span className="text-slate-900">
                      {selectedDistrict ? formatBDT(deliveryFee) : "--"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6 mb-8 flex justify-between items-end">
                  <div className="flex justify-between w-full">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Grand Total</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatBDT(total)}</span>
                  </div>
                </div>

                {errorMsg && (
                  <div className="bg-red-500/10 text-red-500 p-4 rounded-lg text-[10px] font-black uppercase tracking-widest mb-6  flex items-start justify-between gap-3">
                    <p className="leading-relaxed">{errorMsg}</p>
                    <button onClick={() => setErrorMsg("")} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isPending || items.length === 0}
                  className="w-full bg-primary text-white py-5 rounded-lg font-black uppercase tracking-[0.25em] text-xs hover:bg-black transition-all transform active:scale-[0.98] shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Place Order"
                  )}
                </button>
                <div className="mt-6 flex items-center justify-center gap-4 text-slate-300">
                  <div className="h-[1px] flex-1 bg-slate-100"></div>
                  <span className="text-[8px] font-black uppercase tracking-widest">SECURE CHECKOUT</span>
                  <div className="h-[1px] flex-1 bg-slate-100"></div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* DTF MODAL (Classic Aesthetic restored) */}
      {showDTFModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6 md:p-8 relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowDTFModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-zinc-900 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold uppercase tracking-tight mb-6">Jersey Customization</h3>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Player or Custom</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "messi", name: "Messi (10)" },
                    { id: "ronaldo", name: "Ronaldo (7)" },
                    { id: "neymar", name: "Neymar (10)" },
                    { id: "custom", name: "Custom Name" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDtfForm({
                        type: opt.id as any,
                        name: opt.name.includes("(") ? opt.name.split(" (")[0] : "",
                        number: opt.name.includes("(") ? opt.name.split("(")[1].replace(")", "") : ""
                      })}
                      className={`px-3 py-3 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${dtfForm.type === opt.id ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 'border-slate-200 hover:border-primary hover:text-primary text-slate-600'}`}
                    >
                      {opt.name}
                    </button>
                  ))}
                </div>
              </div>

              {dtfForm.type === "custom" && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300 bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</label>
                    <input
                      type="text"
                      value={dtfForm.name}
                      onChange={(e) => setDtfForm({ ...dtfForm, name: e.target.value.toUpperCase() })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold focus:border-primary outline-none transition-colors"
                      placeholder="NAME"
                      maxLength={12}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No.</label>
                    <input
                      type="text"
                      value={dtfForm.number}
                      onChange={(e) => setDtfForm({ ...dtfForm, number: e.target.value.replace(/\D/g, '') })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold focus:border-primary outline-none transition-colors"
                      placeholder="00"
                      maxLength={2}
                    />
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-50 rounded-lg flex justify-between items-center text-[10px] font-black uppercase tracking-widest border border-slate-100">
                <span className="text-slate-400">Customization Fee</span>
                <span className="text-primary italic animate-pulse">৳300</span>
              </div>

              <button
                onClick={saveDTF}
                disabled={dtfForm.type === "custom" && (!dtfForm.name || !dtfForm.number)}
                className="w-full bg-zinc-900 text-white py-4 rounded-lg font-bold uppercase tracking-[0.2em] text-xs hover:bg-black transition-all disabled:opacity-50"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer config={footerData} />
    </main>
  );
}
