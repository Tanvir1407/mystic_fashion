"use client";

import { useCartStore } from "@/store/cartStore";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { FooterData } from "@/lib/footer";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, X, ChevronDown } from "lucide-react";
import { useState, useTransition } from "react";
import { placeOrderAction, validateCoupon } from "./actions";
import { Ticket, Loader2, CheckCircle, Tag } from "lucide-react";

export default function CheckoutClient({ 
  deliveryData, 
  footerData 
}: { 
  deliveryData: { insideDhaka: number, outsideDhaka: number },
  footerData: FooterData
}) {
  const { items, getTotalPrice, clearCart } = useCartStore();
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
  // Format BDT utility
  const formatBDT = (price: number) => {
    return price === 0 ? "Free" : `৳${price.toLocaleString("en-IN")}`;
  };

  const isDhaka = selectedDistrict === "Dhaka";
  const deliveryFee = selectedDistrict ? (isDhaka ? deliveryData.insideDhaka : deliveryData.outsideDhaka) : 0;

  const subtotal = getTotalPrice(); // Total after products discounts
  const originalSubtotal = items.reduce((total, item) => total + (item.originalPrice || item.price) * item.quantity, 0);
  const totalItemDiscount = originalSubtotal - subtotal;

  const total = subtotal + (items.length > 0 ? deliveryFee : 0) - couponDiscount;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsValidating(true);
    setCouponError("");
    setCouponSuccess("");
    
    const res = await validateCoupon(couponCode, subtotal);
    if (res.success && res.discountAmount !== undefined) {
      setCouponDiscount(res.discountAmount);
      setAppliedCoupon(res.couponCode || couponCode);
      setCouponSuccess(`Coupon applied! You saved ${formatBDT(res.discountAmount)}`);
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

    // Custom validation
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
          <Link href="/" className="bg-primary text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#600018] transition-all active:scale-[0.98]">
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

      <div className="flex-1 container mx-auto py-10 md:py-10">
        <div className="mb-10 flex justify-between">
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight mt-6">Checkout</h1>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
              <span className="text-4xl">🛒</span>
            </div>
            <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
            <p className="text-zinc-500 mb-8 max-w-sm">Looks like you haven't added anything to your cart yet.</p>
            <Link href="/" className="bg-primary text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest hover:bg-[#600018] transition-all">
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
                      <input name="fullName" type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="Enter your full name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-zinc-700">Phone Number *</label>
                      <input name="phone" type="tel" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" placeholder="+880 1..." />
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
                      <textarea name="address" rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none" placeholder="House no, Road no, Area etc..." />
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
                <h2 className="text-xl font-bold uppercase tracking-wide mb-6 pb-4 border-b border-slate-100">Order Summary</h2>

                <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                  {items.map((item) => (
                    <div key={`${item.id}-${item.size}`} className="flex gap-4">
                      <div className="relative w-16 h-20 bg-slate-100 rounded-md overflow-hidden flex-shrink-0 border border-slate-200">
                        {item.image && (
                          <Image src={item.image} alt={item.name} fill className="object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-sm leading-snug line-clamp-2">{item.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          {item.size && <span className="text-xs text-zinc-500 mt-1 block">Size: {item.size}</span>}
                          <span className="text-xs font-bold text-zinc-500 mt-1 block">Qty: {item.quantity}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {item.originalPrice && item.originalPrice > item.price && (
                            <span className="text-xs font-bold text-zinc-400 line-through">{formatBDT(item.originalPrice)}</span>
                          )}
                          <p className="font-bold text-primary text-sm">{formatBDT(item.price)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Coupon Section */}
                <div className="mb-6 pt-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2 block">Promo Code</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="text" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        disabled={!!appliedCoupon}
                        className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black tracking-widest focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none disabled:bg-white disabled:text-zinc-400" 
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
                        className="px-4 py-3 border border-red-200 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50 transition-all"
                      >
                        REMOVE
                      </button>
                    ) : (
                      <button 
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={isValidating || !couponCode}
                        className="px-6 py-3 bg-zinc-900 text-white text-xs font-black rounded-xl hover:bg-black transition-all disabled:opacity-50 flex items-center gap-2"
                      >
                        {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : "APPLY"}
                      </button>
                    )}
                  </div>
                  {couponError && <p className="text-[10px] font-bold text-red-500 mt-2 ml-1">{couponError}</p>}
                  {couponSuccess && <p className="text-[10px] font-bold text-green-600 mt-2 ml-1 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> {couponSuccess}</p>}
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-3 mb-6">
                  {totalItemDiscount > 0 && (
                    <>
                      <div className="flex justify-between text-zinc-500 text-sm">
                        <span>Original Subtotal</span>
                        <span className="font-medium line-through">{formatBDT(originalSubtotal)}</span>
                      </div>
                      <div className="flex justify-between text-green-600 text-sm font-bold">
                        <span>Sale Savings</span>
                        <span>-{formatBDT(totalItemDiscount)}</span>
                      </div>
                    </>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-indigo-600 text-sm font-bold">
                      <span className="flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" /> Coupon ({appliedCoupon})</span>
                      <span>-{formatBDT(couponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-600 text-sm">
                    <span>Subtotal</span>
                    <span className="font-bold text-zinc-900">{formatBDT(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 text-sm">
                    <span>Delivery Fee {selectedDistrict && `(${selectedDistrict})`}</span>
                    <span className={`font-bold ${deliveryFee === 0 && selectedDistrict ? 'text-green-600' : 'text-zinc-900'}`}>
                      {selectedDistrict ? formatBDT(deliveryFee) : "Select District..."}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-4 mb-8 flex justify-between items-center">
                  <span className="text-lg font-bold uppercase tracking-widest text-zinc-800">Total</span>
                  <span className="text-2xl font-black text-primary">{formatBDT(total)}</span>
                </div>

                {errorMsg && (
                  <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-bold mb-6 border border-red-200 shadow-sm flex items-start justify-between gap-3">
                    <p>{errorMsg}</p>
                    <button onClick={() => setErrorMsg("")} className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isPending || items.length === 0}
                  className="w-full bg-[#800020] text-[#FFD700] py-4 rounded-xl font-black uppercase tracking-widest hover:bg-[#600018] transition-all transform active:scale-[0.98] shadow-lg shadow-black/10 flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  ) : "Place Order"}
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      <Footer config={footerData} />
    </main>
  );
}
