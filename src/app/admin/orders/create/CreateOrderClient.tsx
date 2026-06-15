"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import { Search, Plus, Trash2, User, Phone, ShoppingBag, CheckCircle, ArrowLeft, Loader2, X, Tags } from "lucide-react";
import Link from "next/link";
import { createAdminOrder, createExchangeOrder } from "../actions";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { getPathaoCities, getPathaoZones, getPathaoAreas } from "@/app/actions/pathao";
import { CustomSelect, CustomSelectRef } from "@/components/CustomSelect";
import { formatBDT, roundPrice } from "@/utils/formatPrice";
import { useToastStore } from "@/store/toastStore";

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
  price: number;
  stock: number;
  requiresPrint?: boolean;
  printCost?: number;
  printDetails?: { name: string; number: string }[];
}

interface StaffMember {
  id: string;
  username: string;
  role: {
    name: string;
  } | null;
}

export default function CreateOrderClient({
  products,
  deliverySettings,
  dtfCostPerItem = 300,
  backUrl = "/admin/orders",
  successUrl = "/admin/orders",
  orderAction,
  staff = [],
}: {
  products: any[];
  deliverySettings: any;
  dtfCostPerItem?: number;
  backUrl?: string;
  successUrl?: string;
  orderAction?: (data: any) => Promise<{ success: boolean; orderId?: string; error?: string }>;
  staff?: StaffMember[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // --- CORE SYSTEM REFS FOR KEYBOARD SEQUENCE ---
  const productSearchRef = useRef<HTMLInputElement>(null);
  const sizeContainerRef = useRef<HTMLDivElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const addToOrderBtnRef = useRef<HTMLButtonElement>(null);

  const customerNameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const citySelectRef = useRef<CustomSelectRef>(null);
  const zoneSelectRef = useRef<CustomSelectRef>(null);
  const areaSelectRef = useRef<CustomSelectRef>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const advancePaidRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const discountTypeRef = useRef<HTMLSelectElement>(null);
  const remarksRef = useRef<HTMLTextAreaElement>(null);
  const specialInstructionRef = useRef<HTMLTextAreaElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const createOrderBtnRef = useRef<HTMLButtonElement>(null);

  // Customer Info States
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [address, setAddress] = useState("");
  const [advancePaid, setAdvancePaid] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [specialInstruction, setSpecialInstruction] = useState("");
  const [manualDiscountValue, setManualDiscountValue] = useState(0);
  const [manualDiscountType, setManualDiscountType] = useState<"FLAT" | "PERCENTAGE">("FLAT");
  const [isStorePickup, setIsStorePickup] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(0);
  const [createdById, setCreatedById] = useState("");
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const showToast = useToastStore(state => state.showToast);

  // Tags & Exchange
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isExchange, setIsExchange] = useState(false);
  const [exchangeRefOrderId, setExchangeRefOrderId] = useState("");
  const [exchangeItemNote, setExchangeItemNote] = useState("");

  // Pathao States
  const [cities, setCities] = useState<{ value: string, label: string }[]>([]);
  const [zones, setZones] = useState<{ value: string, label: string }[]>([]);
  const [areas, setAreas] = useState<{ value: string, label: string }[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);

  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Product Selection States
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // DTF Customization Info
  const [requiresPrint, setRequiresPrint] = useState(false);
  const [pendingPrintDetails, setPendingPrintDetails] = useState<{ name: string; number: string }[]>([]);

  // Page Load Initial Focus Hook
  useEffect(() => {
    productSearchRef.current?.focus();
  }, []);



  // Fetch Pathao Cities
  useEffect(() => {
    async function fetchCities() {
      setLoadingCities(true);
      const res = await getPathaoCities();
      if (res.success && res.data) {
        const cityOptions = res.data.map((c: any) => ({ value: c.city_id.toString(), label: c.city_name }));
        setCities([{ value: "self-pickup", label: "Self Pickup" }, ...cityOptions]);
      }
      setLoadingCities(false);
    }
    fetchCities();
  }, []);

  // Fetch Zones with Cascading Autofocus Trigger
  useEffect(() => {
    async function fetchZones() {
      if (!selectedCityId) { setZones([]); return; }
      setLoadingZones(true);
      const res = await getPathaoZones(selectedCityId);
      if (res.success && res.data) {
        setZones(res.data.map((z: any) => ({ value: z.zone_id.toString(), label: z.zone_name })));
        setTimeout(() => zoneSelectRef.current?.focusAndOpen(), 100);
      }
      setLoadingZones(false);
    }
    fetchZones();
  }, [selectedCityId]);

  // Fetch Areas with Cascading Autofocus Trigger
  useEffect(() => {
    async function fetchAreas() {
      if (!selectedZoneId) { setAreas([]); return; }
      setLoadingAreas(true);
      const res = await getPathaoAreas(selectedZoneId);
      if (res.success && res.data) {
        setAreas(res.data.map((a: any) => ({ value: a.area_id.toString(), label: a.area_name })));
        setTimeout(() => areaSelectRef.current?.focusAndOpen(), 100);
      }
      setLoadingAreas(false);
    }
    fetchAreas();
  }, [selectedZoneId]);

  const fullDeliveryAddress = useMemo(() => {
    const cityName = cities.find(c => c.value === selectedCityId?.toString())?.label || "";
    const zoneName = zones.find(z => z.value === selectedZoneId?.toString())?.label || "";
    const areaName = areas.find(a => a.value === selectedAreaId?.toString())?.label || "";

    const addressParts = [address];
    if (areaName) addressParts.push(areaName);
    if (zoneName) addressParts.push(zoneName);
    if (cityName) addressParts.push(cityName);

    return isStorePickup
      ? (address || "Store Pickup")
      : (district === "Self Pickup" ? address : addressParts.filter(Boolean).map(p => p.trim()).join(", "));
  }, [address, isStorePickup, district, cities, selectedCityId, zones, selectedZoneId, areas, selectedAreaId]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery || selectedProductId === products.find(p => p.name === searchQuery)?.id) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.team?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 8);
  }, [products, searchQuery, selectedProductId]);

  const handleProductSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!searchQuery.trim() && e.key === "ArrowDown") {
      e.preventDefault();
      customerNameRef.current?.focus();
      return;
    }

    if (filteredProducts.length === 0) {
      if (e.key === "Enter" && selectedProductId) {
        e.preventDefault();
        qtyInputRef.current?.focus();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % filteredProducts.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex(prev => (prev - 1 + filteredProducts.length) % filteredProducts.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0) {
        const p = filteredProducts[focusedIndex];
        setSelectedProductId(p.id);
        setSearchQuery(p.name);
        setFocusedIndex(-1);
        // Instant target switch down to variant sizes element block
        setTimeout(() => {
          const firstSizeBtn = sizeContainerRef.current?.querySelector("button");
          (firstSizeBtn as HTMLButtonElement)?.focus();
        }, 50);
      }
    }
  };

  const selectedProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);
  const availableSizes = useMemo(() => selectedProduct?.variants || [], [selectedProduct]);

  const getDiscountedPrice = (product: Product) => {
    if (!product.discount) return product.price;
    if (product.discount.discountType === "PERCENTAGE") {
      return roundPrice(product.price - (product.price * product.discount.value) / 100);
    }
    return roundPrice(product.price - product.discount.value);
  };

  const addToOrder = () => {
    if (!selectedProduct || !selectedSize) return;

    const variant = selectedProduct.variants.find((v: any) => v.size === selectedSize);
    if (!variant) return;

    const unitPrice = getDiscountedPrice(selectedProduct);
    const existingIndex = orderItems.findIndex(
      item => item.productId === selectedProductId && item.size === selectedSize && !item.requiresPrint && !requiresPrint
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
        stock: variant.stock,
        requiresPrint: requiresPrint,
        printCost: dtfCostPerItem,
        printDetails: requiresPrint ? [...pendingPrintDetails] : []
      }]);
    }

    // Reset workflow selection context instantly & refocus search box
    setSearchQuery("");
    setSelectedProductId("");
    setSelectedSize("");
    setQuantity(1);
    setRequiresPrint(false);
    setPendingPrintDetails([]);
    productSearchRef.current?.focus();
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = useMemo(() => orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0), [orderItems]);
  const totalDTFCost = useMemo(() =>
    orderItems.reduce((acc, item) => {
      if (!item.requiresPrint) return acc;
      const count = item.printDetails && item.printDetails.length > 0 ? item.printDetails.length : 1;
      return acc + (count * (item.printCost || dtfCostPerItem));
    }, 0), [orderItems]
  );

  const finalDeliveryCharge = useMemo(() => {
    if (isStorePickup) return deliveryCharge;
    if (district === "Dhaka") return deliverySettings.insideDhaka;
    if (district === "Self Pickup") return 0;
    return deliverySettings.outsideDhaka;
  }, [isStorePickup, deliveryCharge, district, deliverySettings]);

  const calculatedDiscount = useMemo(() => {
    if (manualDiscountType === "PERCENTAGE") return (subtotal * manualDiscountValue) / 100;
    return manualDiscountValue;
  }, [subtotal, manualDiscountValue, manualDiscountType]);

  const totalAmount = (subtotal + totalDTFCost + finalDeliveryCharge) - calculatedDiscount;
  const hasBackorderItems = useMemo(() => orderItems.some(item => item.stock <= 0), [orderItems]);

  const addTag = (inputVal: string) => {
    const trimmed = inputVal.replace(/,/g, "").trim();
    if (trimmed && !tags.includes(trimmed)) setTags([...tags, trimmed]);
    setTagInput("");
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, idx) => idx !== index));
  };

  const validateOrderForm = () => {
    if (!customerName.trim() || !phone.trim() || (!isStorePickup && !address.trim()) || orderItems.length === 0) {
      alert("Please fill in all customer details and add at least one item.");
      return false;
    }
    if (!isStorePickup && selectedCityId && !selectedZoneId) {
      alert("Please select a zone for the selected city.");
      return false;
    }
    if (isExchange && (!exchangeRefOrderId.trim() || !exchangeItemNote.trim())) {
      alert("Please fill in the Original Order ID and Exchange Note.");
      return false;
    }
    return true;
  };

  const handlePreSubmit = () => {
    if (validateOrderForm()) {
      setIsConfirmModalOpen(true);
    }
  };

  const handleSubmit = () => {
    if (!validateOrderForm()) return;

    startTransition(async () => {
      try {
        const res = isExchange
          ? await createExchangeOrder({
            customerName, phone, district, address: fullDeliveryAddress, totalAmount, advancePaid,
            discountAmount: calculatedDiscount, remarks, specialInstruction, pathaoCityId: selectedCityId || undefined,
            pathaoZoneId: selectedZoneId || undefined, pathaoAreaId: selectedAreaId || undefined,
            isStorePickup, deliveryCharge: isStorePickup ? deliveryCharge : finalDeliveryCharge,
            items: orderItems.map(item => ({
              productId: item.productId, size: item.size, quantity: item.quantity, price: item.price,
              requiresPrint: item.requiresPrint, printCost: item.printCost, printDetails: item.printDetails
            })),
            exchangeRefOrderId: exchangeRefOrderId.trim(), exchangeItemNote: exchangeItemNote.trim(),
            tags, createdById: createdById || undefined,
          })
          : await (orderAction ?? createAdminOrder)({
            customerName, phone, district, address: fullDeliveryAddress, totalAmount, advancePaid,
            discountAmount: calculatedDiscount, remarks, specialInstruction, pathaoCityId: selectedCityId || undefined,
            pathaoZoneId: selectedZoneId || undefined, pathaoAreaId: selectedAreaId || undefined,
            isStorePickup, deliveryCharge: isStorePickup ? deliveryCharge : finalDeliveryCharge,
            items: orderItems.map(item => ({
              productId: item.productId, size: item.size, quantity: item.quantity, price: item.price,
              requiresPrint: item.requiresPrint, printCost: item.printCost, printDetails: item.printDetails
            })),
            hasBackorderItems, tags, createdById: createdById || undefined,
          });

        if (res.success) {
          setIsConfirmModalOpen(false);
          showToast("Order successfully created", "success");

          // Reset all form states to empty for the next manual entry
          setCustomerName("");
          setPhone("");
          setAddress("");
          setAdvancePaid(0);
          setRemarks("");
          setSpecialInstruction("");
          setManualDiscountValue(0);
          setManualDiscountType("FLAT");
          setIsStorePickup(false);
          setDeliveryCharge(0);
          setSelectedCityId(null);
          setSelectedZoneId(null);
          setSelectedAreaId(null);
          setDistrict("Dhaka");
          setOrderItems([]);
          setTags([]);
          setTagInput("");
          setIsExchange(false);
          setExchangeRefOrderId("");
          setExchangeItemNote("");
          setCreatedById("");

          // Focus back on product search database to enable instant typing
          setTimeout(() => {
            productSearchRef.current?.focus();
          }, 100);
        } else {
          alert(res.error || "Failed to create order.");
        }
      } catch (error) {
        console.error(error);
        alert("An unexpected error occurred.");
      }
    });
  };

  // Hotkey Global Listener: Pressing Ctrl + Enter down shifts focus from anywhere to Customer Info block
  // Pressing Shift + Enter opens the confirmation popup modal
  useEffect(() => {
    const handleGlobalHotkeys = (e: KeyboardEvent) => {
      if (isConfirmModalOpen) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSubmit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          setIsConfirmModalOpen(false);
        }
        return;
      }

      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        customerNameRef.current?.focus();
      } else if (e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        handlePreSubmit();
      }
    };
    window.addEventListener("keydown", handleGlobalHotkeys);
    return () => window.removeEventListener("keydown", handleGlobalHotkeys);
  }, [
    isConfirmModalOpen,
    customerName,
    phone,
    address,
    isStorePickup,
    selectedCityId,
    selectedZoneId,
    isExchange,
    exchangeRefOrderId,
    exchangeItemNote,
    orderItems,
    fullDeliveryAddress,
    totalAmount,
    advancePaid,
    calculatedDiscount,
    remarks,
    specialInstruction,
    deliveryCharge,
    finalDeliveryCharge,
    createdById,
    tags,
    hasBackorderItems
  ]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 text-xs font-sans select-none antialiased text-slate-900">

      {/* ====================================================
          LEFT WORKSPACE PANEL: Inputs & Logistics (66.6%)
         ==================================================== */}
      <div className="xl:col-span-8 space-y-6">

        {/* Product Engine Block */}
        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-4">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-1.5">PRODUCT SELECTION</h2>
          </div>

          <div className="space-y-4">
            {/* Search Box Component - Full Width */}
            <div className="relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">SEARCH DATABASE</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 font-bold" />
                <input
                  ref={productSearchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setFocusedIndex(-1); }}
                  onKeyDown={handleProductSearchKeyDown}
                  placeholder="Type product name, team, or category..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              {/* Dynamic Overlay Results list dropdown layout */}
              {filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded shadow-xl z-50 overflow-hidden">
                  <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
                    {filteredProducts.map((p, idx) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseEnter={() => setFocusedIndex(idx)}
                        onClick={() => {
                          setSelectedProductId(p.id);
                          setSearchQuery(p.name);
                          setFocusedIndex(-1);
                          setTimeout(() => {
                            const firstBtn = sizeContainerRef.current?.querySelector("button");
                            (firstBtn as HTMLButtonElement)?.focus();
                          }, 50);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors border-b last:border-0 border-slate-50 ${focusedIndex === idx ? "bg-primary text-white" : "hover:bg-slate-50 text-slate-800"
                          }`}
                      >
                        <div className="truncate font-bold text-xs pr-2">{p.name}</div>
                        <div className={`font-mono font-black text-xs shrink-0 ${focusedIndex === idx ? "text-white" : "text-primary"}`}>
                          {formatBDT(p.price)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stacked parameters row below */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Matrix Variant Size Chips Wrapper Section */}
              <div className="md:col-span-8">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">SIZE SELECTION (STOCK)</label>
                <div ref={sizeContainerRef} className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                  {selectedProductId ? (
                    availableSizes.map((v, idx) => {
                      const isOutOfStock = v.stock <= 0;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedSize(v.size);
                            setTimeout(() => qtyInputRef.current?.focus(), 50);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "ArrowRight") {
                              e.preventDefault();
                              const nextBtn = sizeContainerRef.current?.querySelectorAll("button")[idx + 1];
                              (nextBtn as HTMLButtonElement)?.focus();
                            } else if (e.key === "ArrowLeft") {
                              e.preventDefault();
                              const prevBtn = sizeContainerRef.current?.querySelectorAll("button")[idx - 1];
                              (prevBtn as HTMLButtonElement)?.focus();
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              productSearchRef.current?.focus();
                            } else if (e.key === "Enter") {
                              e.preventDefault();
                              setSelectedSize(v.size);
                              qtyInputRef.current?.focus();
                            }
                          }}
                          className={`px-2.5 py-1 text-xs font-black rounded border tracking-tight transition-all uppercase ${selectedSize === v.size
                            ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                            : isOutOfStock
                              ? "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-100"
                            }`}
                        >
                          {v.size} <span className="font-normal text-[10px]">({v.stock})</span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-slate-400 italic text-xs leading-6">Select a product first to view available attributes</div>
                  )}
                </div>
              </div>

              {/* Quantity Counter Input field */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">QTY</label>
                <input
                  ref={qtyInputRef}
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={e => setQuantity(parseInt(e.target.value) || 1)}
                  onKeyDown={(e) => { if (e.key === "Enter") addToOrder(); }}
                  className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded font-bold text-center outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Manual Dynamic Push Button Trigger */}
              <div className="md:col-span-2">
                <button
                  ref={addToOrderBtnRef}
                  type="button"
                  onClick={addToOrder}
                  disabled={!selectedProductId || !selectedSize}
                  className="w-full h-[28px] bg-slate-900 text-white font-bold rounded flex items-center justify-center hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-300 transition-all text-xs uppercase tracking-wider gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD</span>
                </button>
              </div>
            </div>
          </div>

          {/* Out of Stock Override Notice area integration */}
          {selectedSize && availableSizes.find(v => v.size === selectedSize)?.stock <= 0 && (
            <div className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 p-2 rounded">
              ⚠ Backorder: Item is out of stock.
            </div>
          )}

          {/* Jersey Customization (DTF) Panel Area */}
          {selectedProductId && selectedSize && (
            <div className="pt-2 border-t border-dashed border-slate-200">
              <label className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-primary cursor-pointer uppercase tracking-wide text-[10px]">
                <input
                  type="checkbox"
                  checked={requiresPrint}
                  onChange={(e) => {
                    setRequiresPrint(e.target.checked);
                    if (e.target.checked && pendingPrintDetails.length === 0) {
                      setPendingPrintDetails([{ name: "", number: "" }]);
                    }
                  }}
                  className="rounded text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer"
                />
                ADD JERSEY CUSTOMIZATION (+৳{dtfCostPerItem}/item)
              </label>

              {requiresPrint && (
                <div className="mt-2 bg-slate-50 p-2 rounded border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center border-b pb-1 mb-1 text-[9px] uppercase font-black text-slate-400 tracking-wider">
                    <span>PRINT DETAILS</span>
                  </div>
                  <div className="space-y-1.5">
                    {pendingPrintDetails.map((detail, idx) => (
                      <div key={idx} className="flex gap-2 items-center bg-white p-1 rounded border shadow-sm">
                        <span className="font-mono font-black text-slate-400 text-[10px] px-1.5">{idx + 1}</span>
                        <input
                          type="text"
                          placeholder="NAME ON JERSEY"
                          value={detail.name}
                          onChange={(e) => {
                            const updated = [...pendingPrintDetails];
                            updated[idx].name = e.target.value;
                            setPendingPrintDetails(updated);
                          }}
                          className="flex-1 px-2 py-1 border border-slate-200 rounded font-bold text-xs outline-none focus:border-primary"
                        />
                        <input
                          type="text"
                          placeholder="NUMBER"
                          value={detail.number}
                          onChange={(e) => {
                            const updated = [...pendingPrintDetails];
                            updated[idx].number = e.target.value;
                            setPendingPrintDetails(updated);
                          }}
                          className="w-16 px-2 py-1 border border-slate-200 rounded font-bold text-xs text-center outline-none focus:border-primary"
                        />
                        <button
                          type="button"
                          onClick={() => setPendingPrintDetails(pendingPrintDetails.filter((_, i) => i !== idx))}
                          className="p-1 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {pendingPrintDetails.length < quantity && (
                    <button
                      type="button"
                      onClick={() => setPendingPrintDetails([...pendingPrintDetails, { name: "", number: "" }])}
                      className="text-[9px] font-black uppercase text-primary bg-primary/5 hover:bg-primary/10 px-2 py-1 border border-primary/20 rounded flex items-center gap-1 mt-1"
                    >
                      <Plus className="w-3 h-3" /> ADD SLOT
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Core Administrative Parameters Form */}
        <div className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 mb-4">
            <h2 className="font-bold text-sm uppercase tracking-wider text-slate-800 flex items-center gap-1.5">CUSTOMER INFORMATION</h2>

            {/* Header Level Interactive Flags */}
            <div className="flex gap-3 text-[10px] font-bold">
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isStorePickup}
                  onChange={(e) => {
                    setIsStorePickup(e.target.checked);
                    setDistrict(e.target.checked ? "Self Pickup" : "Dhaka");
                  }}
                  className="w-3.5 h-3.5 text-primary focus:ring-primary rounded"
                />
                <span>STORE PICKUP</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer text-orange-700">
                <input
                  type="checkbox"
                  checked={isExchange}
                  onChange={(e) => setIsExchange(e.target.checked)}
                  className="w-3.5 h-3.5 text-orange-600 focus:ring-orange-500 rounded"
                />
                <span>EXCHANGE ORDER</span>
              </label>
            </div>
          </div>

          {/* Metadata Block inputs array */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">CUSTOMER NAME</label>
              <input
                ref={customerNameRef}
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    phoneRef.current?.focus();
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    productSearchRef.current?.focus();
                  }
                }}
                placeholder="Enter name"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-xs outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">PHONE NUMBER</label>
              <input
                ref={phoneRef}
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (isStorePickup) {
                      addressRef.current?.focus();
                    } else {
                      citySelectRef.current?.focusAndOpen();
                    }
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    customerNameRef.current?.focus();
                  } else if (e.key === "ArrowLeft") {
                    const el = e.currentTarget as HTMLInputElement;
                    if (el.selectionStart === 0) {
                      e.preventDefault();
                      customerNameRef.current?.focus();
                    }
                  }
                }}
                placeholder="01XXXXXXXXX"
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-mono text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">SALESMAN (INCENTIVE OWNER)</label>
              <CustomSelect
                options={[
                  { value: "", label: "Current Logged-in User (Default)" },
                  ...staff.map((s: StaffMember) => ({ value: s.id, label: `${s.username} (${s.role?.name || "Staff"})` }))
                ]}
                value={createdById}
                onChange={(val) => setCreatedById(val)}
                searchable={true}
                heightClass="h-8"
                textClass="text-xs"
              />
            </div>

            {isStorePickup && (
              <div className="space-y-1 animate-in fade-in duration-150">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">STORE PICKUP DELIVERY FEE</label>
                <input
                  type="number"
                  value={deliveryCharge || ""}
                  onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-bold text-xs outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            )}
          </div>

          {/* Exchange Logic Input Section */}
          {isExchange && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border border-orange-200 bg-orange-50/40 rounded animate-in fade-in duration-150">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block mb-1">ORIGINAL ORDER ID *</label>
                <input
                  type="text"
                  value={exchangeRefOrderId}
                  onChange={(e) => setExchangeRefOrderId(e.target.value.toUpperCase())}
                  placeholder="M-26052301"
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded font-mono text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block mb-1">EXCHANGE NOTE *</label>
                <input
                  type="text"
                  value={exchangeItemNote}
                  onChange={(e) => setExchangeItemNote(e.target.value)}
                  placeholder="e.g. XL → XXL"
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-xs font-semibold outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Pathao Relational API Select Fields Row */}
          {!isStorePickup && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-3">
              <div>
                <CustomSelect
                  ref={citySelectRef}
                  label="SELECT CITY *"
                  placeholder={loadingCities ? "🔄" : "-- Select City --"}
                  searchable
                  options={cities}
                  value={selectedCityId?.toString() || (district === "Self Pickup" ? "self-pickup" : "")}
                  onChange={(val) => {
                    if (val === "self-pickup") {
                      setSelectedCityId(null); setSelectedZoneId(null); setSelectedAreaId(null); setDistrict("Self Pickup");
                      setTimeout(() => addressRef.current?.focus(), 50);
                    } else {
                      const id = parseInt(val); setSelectedCityId(id); setSelectedZoneId(null); setSelectedAreaId(null);
                      const city = cities.find(c => c.value === val); if (city) setDistrict(city.label);
                    }
                  }}
                  onKeyDownDirect={(e, isOpen, closeSelect) => {
                    const isSearchInput = e.target instanceof HTMLInputElement;
                    const searchVal = isSearchInput ? (e.target as HTMLInputElement).value : "";
                    const cursorAtStart = isSearchInput ? (e.target as HTMLInputElement).selectionStart === 0 : true;

                    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      if (!isOpen || (isSearchInput && cursorAtStart && !searchVal)) {
                        e.preventDefault();
                        closeSelect();
                        phoneRef.current?.focus();
                      }
                    } else if (e.key === "ArrowRight") {
                      if (!isOpen || (isSearchInput && !searchVal)) {
                        e.preventDefault();
                        closeSelect();
                        if (selectedCityId && zones.length > 0) {
                          zoneSelectRef.current?.focusAndOpen();
                        } else {
                          addressRef.current?.focus();
                        }
                      }
                    } else if (e.key === "Enter") {
                      if (!isOpen) {
                        e.preventDefault();
                        if (selectedCityId && zones.length > 0) {
                          zoneSelectRef.current?.focusAndOpen();
                        } else {
                          addressRef.current?.focus();
                        }
                      }
                    }
                  }}
                  heightClass="h-8"
                  textClass="text-xs"
                />
              </div>
              <div>
                <CustomSelect
                  ref={zoneSelectRef}
                  label="SELECT ZONE *"
                  placeholder={loadingZones ? "🔄" : (selectedCityId ? "-- Zone --" : "First select city")}
                  searchable
                  disabled={!selectedCityId || loadingZones}
                  options={zones}
                  value={selectedZoneId?.toString() || ""}
                  onChange={(val) => {
                    setSelectedZoneId(parseInt(val)); setSelectedAreaId(null);
                  }}
                  onKeyDownDirect={(e, isOpen, closeSelect) => {
                    const isSearchInput = e.target instanceof HTMLInputElement;
                    const searchVal = isSearchInput ? (e.target as HTMLInputElement).value : "";
                    const cursorAtStart = isSearchInput ? (e.target as HTMLInputElement).selectionStart === 0 : true;

                    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      if (!isOpen || (isSearchInput && cursorAtStart && !searchVal)) {
                        e.preventDefault();
                        closeSelect();
                        citySelectRef.current?.focusAndOpen();
                      }
                    } else if (e.key === "ArrowRight") {
                      if (!isOpen || (isSearchInput && !searchVal)) {
                        e.preventDefault();
                        closeSelect();
                        if (selectedZoneId && areas.length > 0) {
                          areaSelectRef.current?.focusAndOpen();
                        } else {
                          addressRef.current?.focus();
                        }
                      }
                    } else if (e.key === "Enter") {
                      if (!isOpen) {
                        e.preventDefault();
                        if (selectedZoneId && areas.length > 0) {
                          areaSelectRef.current?.focusAndOpen();
                        } else {
                          addressRef.current?.focus();
                        }
                      }
                    }
                  }}
                  heightClass="h-8"
                  textClass="text-xs"
                />
              </div>
              <div>
                <CustomSelect
                  ref={areaSelectRef}
                  label="SELECT AREA"
                  placeholder={loadingAreas ? "🔄" : (selectedZoneId ? "-- Area --" : "First select zone")}
                  searchable
                  disabled={!selectedZoneId || loadingAreas}
                  options={areas}
                  value={selectedAreaId?.toString() || ""}
                  onChange={(val) => {
                    setSelectedAreaId(parseInt(val));
                    setTimeout(() => addressRef.current?.focus(), 100);
                  }}
                  onKeyDownDirect={(e, isOpen, closeSelect) => {
                    const isSearchInput = e.target instanceof HTMLInputElement;
                    const searchVal = isSearchInput ? (e.target as HTMLInputElement).value : "";
                    const cursorAtStart = isSearchInput ? (e.target as HTMLInputElement).selectionStart === 0 : true;

                    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      if (!isOpen || (isSearchInput && cursorAtStart && !searchVal)) {
                        e.preventDefault();
                        closeSelect();
                        zoneSelectRef.current?.focusAndOpen();
                      }
                    } else if (e.key === "ArrowRight" || e.key === "Enter") {
                      if (!isOpen || (isSearchInput && !searchVal)) {
                        e.preventDefault();
                        closeSelect();
                        addressRef.current?.focus();
                      }
                    }
                  }}
                  heightClass="h-8"
                  textClass="text-xs"
                />
              </div>
            </div>
          )}

          {/* Full Street Address Line Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">FULL ADDRESS *</label>
            <input
              ref={addressRef}
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  advancePaidRef.current?.focus();
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  if (isStorePickup) {
                    phoneRef.current?.focus();
                  } else if (selectedZoneId && areas.length > 0) {
                    areaSelectRef.current?.focusAndOpen();
                  } else if (selectedCityId && zones.length > 0) {
                    zoneSelectRef.current?.focusAndOpen();
                  } else {
                    citySelectRef.current?.focusAndOpen();
                  }
                } else if (e.key === "ArrowLeft") {
                  const el = e.currentTarget as HTMLInputElement;
                  if (el.selectionStart === 0) {
                    e.preventDefault();
                    if (isStorePickup) {
                      phoneRef.current?.focus();
                    } else if (selectedZoneId && areas.length > 0) {
                      areaSelectRef.current?.focusAndOpen();
                    } else if (selectedCityId && zones.length > 0) {
                      zoneSelectRef.current?.focusAndOpen();
                    } else {
                      citySelectRef.current?.focusAndOpen();
                    }
                  }
                }
              }}
              placeholder="e.g., House 12, Road 4, Block C, Mirpur 2, Dhaka"
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded font-semibold text-xs outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 pt-3">
            {/* Advance Paid input structure */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-1">ADVANCE PAID (BDT)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">৳</span>
                <input
                  ref={advancePaidRef}
                  type="number"
                  value={advancePaid || ""}
                  onChange={e => setAdvancePaid(parseFloat(e.target.value) || 0)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      discountRef.current?.focus();
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      addressRef.current?.focus();
                    } else if (e.key === "ArrowLeft") {
                      const el = e.currentTarget as HTMLInputElement;
                      if (el.selectionStart === 0) {
                        e.preventDefault();
                        addressRef.current?.focus();
                      }
                    }
                  }}
                  className="w-full pl-6 pr-3 py-1 bg-red-50/40 border border-red-200 rounded font-mono text-xs font-bold text-red-600 outline-none focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Discount Section Component */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">MANUAL DISCOUNT</label>
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-black text-primary/70">
                    {manualDiscountType === "FLAT" ? "৳" : "%"}
                  </span>
                  <input
                    ref={discountRef}
                    type="number"
                    value={manualDiscountValue || ""}
                    onChange={e => setManualDiscountValue(parseFloat(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        discountTypeRef.current?.focus();
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        addressRef.current?.focus();
                      } else if (e.key === "ArrowLeft") {
                        const el = e.currentTarget as HTMLInputElement;
                        if (el.selectionStart === 0) {
                          e.preventDefault();
                          advancePaidRef.current?.focus();
                        }
                      }
                    }}
                    className="w-full pl-5 pr-2 py-1 bg-primary/5 border border-primary/20 rounded font-mono text-xs font-bold text-primary outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    placeholder="0"
                  />
                </div>
                <select
                  ref={discountTypeRef}
                  value={manualDiscountType}
                  onChange={e => setManualDiscountType(e.target.value as "FLAT" | "PERCENTAGE")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      remarksRef.current?.focus();
                    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                      e.preventDefault();
                      discountRef.current?.focus();
                    }
                  }}
                  className="px-1 py-1 bg-primary/5 border border-primary/20 rounded text-[9px] font-black uppercase outline-none focus:bg-white focus:border-primary cursor-pointer"
                >
                  <option value="FLAT">FLAT</option>
                  <option value="PERCENTAGE">%</option>
                </select>
              </div>
            </div>
          </div>

          {/* Internal Remarks Textarea component */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">NOTES</label>
            <textarea
              ref={remarksRef}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  specialInstructionRef.current?.focus();
                } else if (e.key === "ArrowUp") {
                  const el = e.currentTarget as HTMLTextAreaElement;
                  if (el.selectionStart === 0) {
                    e.preventDefault();
                    discountTypeRef.current?.focus();
                  }
                }
              }}
              placeholder="Add any internal notes, packaging instructions, or customer requests..."
              rows={2}
              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded font-medium text-xs focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
            />
          </div>

          {/* Pathao Special Instructions component */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">PATHAO SPECIAL INSTRUCTIONS</label>
            <textarea
              ref={specialInstructionRef}
              value={specialInstruction}
              onChange={e => setSpecialInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  tagInputRef.current?.focus();
                } else if (e.key === "ArrowUp") {
                  const el = e.currentTarget as HTMLTextAreaElement;
                  if (el.selectionStart === 0) {
                    e.preventDefault();
                    remarksRef.current?.focus();
                  }
                }
              }}
              placeholder="Add special instructions for Pathao delivery rider..."
              rows={2}
              className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded font-medium text-xs focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
            />
          </div>

          {/* Admin Tag Engine Input field */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-1"><Tags className="w-3 h-3" /> ORDER TAGS</label>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50 border border-slate-200 rounded min-h-[32px] focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary focus-within:bg-white transition-all">
              {tags.map((tag, idx) => (
                <span key={tag} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-900 text-white uppercase tracking-wider">
                  {tag}
                  <button type="button" onClick={() => removeTag(idx)} className="text-slate-400 hover:text-white"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    if (tagInput.trim()) {
                      addTag(tagInput);
                    } else {
                      createOrderBtnRef.current?.focus();
                    }
                  } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                    if (!tagInput.trim()) {
                      e.preventDefault();
                      specialInstructionRef.current?.focus();
                    }
                  }
                }}
                placeholder="Type tag & hit enter..."
                className="flex-1 bg-transparent border-0 p-0 text-xs focus:ring-0 outline-none placeholder:text-slate-400 font-semibold"
              />
            </div>
          </div>
        </div>
      </div>

      {/* =======================================================
          RIGHT WORKSPACE PANEL: Unified Order Summary Card (33.3%)
         ======================================================= */}
      <div className="xl:col-span-4 space-y-6">
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
          {/* Card Header */}
          <div className="bg-slate-900 text-white font-bold text-xs uppercase px-4 py-3.5 flex items-center justify-between tracking-wider">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-white" />
              ORDER SUMMARY
            </span>
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-4">
            {/* Basket Items List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2 px-1">Item Details</th>
                    <th className="py-2 px-1 text-center w-12">Size</th>
                    <th className="py-2 px-1 text-center w-12">Qty</th>
                    <th className="py-2 px-1 text-right w-20">Price</th>
                    <th className="py-2 px-1 text-right w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {orderItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic font-normal text-xs">
                        Basket is empty. Scan barcode or query products above.
                      </td>
                    </tr>
                  ) : (
                    orderItems.map((item, idx) => (
                      <tr key={`${item.productId}-${item.size}-${idx}`} className={`hover:bg-slate-50/80 transition-colors ${item.stock <= 0 ? "bg-orange-50/30" : ""}`}>
                        <td className="py-2 px-1">
                          <div className="font-bold text-slate-800 text-xs">{item.productName}</div>
                          {item.stock <= 0 && (
                            <span className="mt-0.5 inline-block text-[8px] font-black text-orange-600 bg-orange-100 px-1 py-0 rounded">BACKORDER</span>
                          )}
                          {item.requiresPrint && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {(item.printDetails || []).map((pd, pidx) => (
                                <span key={pidx} className="text-[8px] font-black text-primary bg-primary/5 border border-primary/10 px-1.5 py-0 rounded">
                                  👕 {pd.name || "???"} #{pd.number || "00"}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-1 text-center">
                          <span className="px-1.5 py-0.5 bg-slate-50 rounded font-black text-[10px] border border-slate-200">{item.size}</span>
                        </td>
                        <td className="py-2 px-1 text-center font-bold text-xs text-slate-700">{item.quantity}</td>
                        <td className="py-2 px-1 text-right font-mono font-bold text-slate-700">{formatBDT(item.price)}</td>
                        <td className="py-2 px-1 text-right">
                          <button onClick={() => removeItem(idx)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t border-slate-200 pt-3 space-y-2 text-xs font-semibold">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal ({orderItems.length} items)</span>
                <span className="font-mono text-slate-800 font-bold">{formatBDT(subtotal)}</span>
              </div>

              <div className="flex justify-between text-slate-500">
                <span>Delivery Charge</span>
                <span className="font-mono text-slate-800 font-bold">{formatBDT(finalDeliveryCharge)}</span>
              </div>

              {totalDTFCost > 0 && (
                <div className="flex justify-between text-primary font-bold">
                  <span>Customization Fee</span>
                  <span className="font-mono text-primary">{formatBDT(totalDTFCost)}</span>
                </div>
              )}

              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Discount</span>
                  <span className="font-mono text-emerald-700">- {formatBDT(calculatedDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-500">
                <span>Advance Paid</span>
                <span className="font-mono text-slate-800 font-bold">- {formatBDT(advancePaid)}</span>
              </div>

              <div className="flex justify-between text-slate-800 border-t border-slate-200 pt-2.5 font-bold uppercase tracking-wider text-xs">
                <span>GRAND TOTAL</span>
                <span className="font-mono text-slate-900 text-sm font-black">{formatBDT(totalAmount)}</span>
              </div>

              {/* Net Due Focus Area */}
              <div className="border-t border-slate-100 pt-3 space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">NET DUE</span>
                  <span className="text-xl font-black font-mono text-primary tracking-tighter">
                    {formatBDT(totalAmount - advancePaid)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-normal leading-tight normal-case">
                  Inclusive of all applicable taxes and charges
                </p>
              </div>

              {/* Backorder warning injection panel */}
              {hasBackorderItems && (
                <div className="border border-dashed border-orange-200 bg-orange-50 p-2 rounded text-[10px] font-bold text-center text-orange-700 tracking-wide uppercase">
                  ⚠ Invoice contains line items on Backorder status.
                </div>
              )}

              {/* Actions Submission button wrapper area */}
              <div className="pt-2 space-y-3">
                <button
                  ref={createOrderBtnRef}
                  onClick={handlePreSubmit}
                  disabled={isPending || orderItems.length === 0}
                  className="w-full text-white font-black py-2.5 rounded text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed border border-transparent transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.99]"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      CREATE ORDER
                    </>
                  )}
                </button>

                <div className="flex justify-center pt-1">
                  <Link
                    href={backUrl}
                    className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 text-[10px] font-bold transition-colors uppercase tracking-wider"
                  >
                    <ArrowLeft className="w-3 h-3" /> Discard & Back to List
                  </Link>
                </div>


              </div>
            </div>
          </div>
        </div>
      </div>

      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl border border-slate-200 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-xs font-sans text-slate-900">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white font-bold text-xs uppercase px-6 py-4 flex items-center justify-between tracking-wider">
              <span>CONFIRM ORDER DETAILS</span>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Customer Details Block */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  CUSTOMER DETAILS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">CUSTOMER NAME</span>
                    <span className="font-bold text-slate-800 text-xs">{customerName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">PHONE NUMBER</span>
                    <span className="font-mono font-bold text-slate-800 text-xs">{phone}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">SHIPPING ADDRESS</span>
                    <span className="font-bold text-slate-800 leading-relaxed block text-xs">{fullDeliveryAddress}</span>
                  </div>
                </div>
              </div>

              {/* Items Block */}
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  ORDERED PRODUCTS
                </h3>
                <div className="border border-slate-200 rounded overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3 text-center w-16">Size</th>
                        <th className="py-2 px-3 text-center w-16">Qty</th>
                        <th className="py-2 px-3 text-right w-24">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-medium text-xs">
                      {orderItems.map((item, idx) => (
                        <tr key={`${item.productId}-${item.size}-${idx}`} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">{item.productName}</div>
                            {item.requiresPrint && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(item.printDetails || []).map((pd, pidx) => (
                                  <span key={pidx} className="text-[8px] font-black text-primary bg-primary/5 border border-primary/10 px-1.5 py-0.5 rounded">
                                    👕 {pd.name || "???"} #{pd.number || "00"}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-1.5 py-0.5 bg-slate-50 rounded font-black text-[10px] border border-slate-200">{item.size}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-700">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700">{formatBDT(item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculations Summary Block */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs font-semibold">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal ({orderItems.length} items)</span>
                  <span className="font-mono text-slate-800 font-bold">{formatBDT(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Delivery Charge</span>
                  <span className="font-mono text-slate-800 font-bold">{formatBDT(isStorePickup ? deliveryCharge : finalDeliveryCharge)}</span>
                </div>
                {totalDTFCost > 0 && (
                  <div className="flex justify-between text-primary font-bold">
                    <span>Customization Fee</span>
                    <span className="font-mono text-primary">{formatBDT(totalDTFCost)}</span>
                  </div>
                )}
                {calculatedDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Discount</span>
                    <span className="font-mono text-emerald-700">- {formatBDT(calculatedDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>Advance Paid</span>
                  <span className="font-mono text-slate-800 font-bold">- {formatBDT(advancePaid)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2.5 text-slate-800 font-bold uppercase tracking-wider text-xs">
                  <span>Grand Total</span>
                  <span className="font-mono text-slate-900 font-black">{formatBDT(totalAmount)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-slate-800 font-bold uppercase tracking-wider text-xs">
                  <span className="text-primary font-black">NET DUE</span>
                  <span className="font-mono text-primary text-sm font-black">{formatBDT(totalAmount - advancePaid)}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all rounded uppercase tracking-wider"
              >
                Cancel (Esc)
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-black transition-all flex items-center gap-1.5 rounded uppercase tracking-wider shadow-sm"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Done (Enter)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}