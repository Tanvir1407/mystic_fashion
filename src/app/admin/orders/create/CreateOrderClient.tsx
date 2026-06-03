"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import { Search, Plus, Trash2, User, Phone, MapPin, ShoppingBag, CheckCircle, ArrowLeft, Loader2, X } from "lucide-react";
import Link from "next/link";
import { createAdminOrder, createExchangeOrder } from "../actions";
import { useRouter } from "next/navigation";
import { getPathaoCities, getPathaoZones, getPathaoAreas } from "@/app/actions/pathao";
import { CustomSelect } from "@/components/CustomSelect";
import { formatBDT, roundPrice } from "@/utils/formatPrice";

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
  requiresPrint?: boolean;
  printCost?: number;
  printDetails?: { name: string; number: string }[];
}

export default function CreateOrderClient({
  products,
  deliverySettings,
  dtfCostPerItem = 300,
  backUrl = "/admin/orders",
  successUrl = "/admin/orders",
  orderAction,
}: {
  products: any[];
  deliverySettings: any;
  dtfCostPerItem?: number;
  backUrl?: string;
  successUrl?: string;
  orderAction?: (data: any) => Promise<{ success: boolean; orderId?: string; error?: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Customer Info
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("Dhaka");
  const [address, setAddress] = useState("");
  const [advancePaid, setAdvancePaid] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [manualDiscountValue, setManualDiscountValue] = useState(0);
  const [manualDiscountType, setManualDiscountType] = useState<"FLAT" | "PERCENTAGE">("FLAT");
  const [isStorePickup, setIsStorePickup] = useState(false);
  const [deliveryCharge, setDeliveryCharge] = useState(0);

  // Tags State & Helpers
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const addTag = (inputVal: string) => {
    const trimmed = inputVal.replace(/,/g, "").trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (indexToRemove: number) => {
    setTags(tags.filter((_, idx) => idx !== indexToRemove));
  };

  // Exchange states
  const [isExchange, setIsExchange] = useState(false);
  const [exchangeRefOrderId, setExchangeRefOrderId] = useState("");
  const [exchangeItemNote, setExchangeItemNote] = useState("");

  // Pathao Location States
  const [cities, setCities] = useState<{ value: string, label: string }[]>([]);
  const [zones, setZones] = useState<{ value: string, label: string }[]>([]);
  const [areas, setAreas] = useState<{ value: string, label: string }[]>([]);

  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);

  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Fetch Pathao Cities on mount
  useEffect(() => {
    async function fetchCities() {
      setLoadingCities(true);
      const res = await getPathaoCities();
      if (res.success && res.data) {
        const cityOptions = res.data.map((c: any) => ({ value: c.city_id.toString(), label: c.city_name }));
        // Add Self Pickup as a special city option if needed, or just keep it separate.
        // User asked to retain existing functionality, so I'll add "Self Pickup" as a special option.
        setCities([
          { value: "self-pickup", label: "Self Pickup" },
          ...cityOptions
        ]);
      }
      setLoadingCities(false);
    }
    fetchCities();
  }, []);

  // Fetch Zones when City changes
  useEffect(() => {
    async function fetchZones() {
      if (!selectedCityId) {
        setZones([]);
        return;
      }
      setLoadingZones(true);
      const res = await getPathaoZones(selectedCityId);
      if (res.success && res.data) {
        setZones(res.data.map((z: any) => ({ value: z.zone_id.toString(), label: z.zone_name })));
      }
      setLoadingZones(false);
    }
    fetchZones();
  }, [selectedCityId]);

  // Fetch Areas when Zone changes
  useEffect(() => {
    async function fetchAreas() {
      if (!selectedZoneId) {
        setAreas([]);
        return;
      }
      setLoadingAreas(true);
      const res = await getPathaoAreas(selectedZoneId);
      if (res.success && res.data) {
        setAreas(res.data.map((a: any) => ({ value: a.area_id.toString(), label: a.area_name })));
      }
      setLoadingAreas(false);
    }
    fetchAreas();
  }, [selectedZoneId]);

  // Items in current order
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  // Product Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // DTF States for the pending item
  const [requiresPrint, setRequiresPrint] = useState(false);
  const [pendingPrintDetails, setPendingPrintDetails] = useState<{ name: string; number: string }[]>([]);

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
      return roundPrice(product.price - (product.price * product.discount.value) / 100);
    }
    return roundPrice(product.price - product.discount.value);
  };

  const addToOrder = () => {
    if (!selectedProduct || !selectedSize) return;

    const variant = selectedProduct.variants.find((v: any) => v.size === selectedSize);
    if (!variant) return;

    const unitPrice = getDiscountedPrice(selectedProduct);

    // Check if item already exists (only merge if NEITHER requires print)
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

    // Reset selection for next item
    setSearchQuery("");
    setSelectedProductId("");
    setSelectedSize("");
    setQuantity(1);
    setRequiresPrint(false);
    setPendingPrintDetails([]);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(() =>
    orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
    [orderItems]
  );

  const totalDTFCost = useMemo(() =>
    orderItems.reduce((acc, item) => {
      if (!item.requiresPrint) return acc;
      const count = item.printDetails && item.printDetails.length > 0 ? item.printDetails.length : 1;
      return acc + (count * (item.printCost || dtfCostPerItem));
    }, 0),
    [orderItems]
  );

  const finalDeliveryCharge = useMemo(() => {
    if (isStorePickup) return deliveryCharge;
    if (district === "Dhaka") return deliverySettings.insideDhaka;
    if (district === "Self Pickup") return 0;
    return deliverySettings.outsideDhaka;
  }, [isStorePickup, deliveryCharge, district, deliverySettings]);

  const calculatedDiscount = useMemo(() => {
    if (manualDiscountType === "PERCENTAGE") {
      return (subtotal * manualDiscountValue) / 100;
    }
    return manualDiscountValue;
  }, [subtotal, manualDiscountValue, manualDiscountType]);

  const totalAmount = (subtotal + totalDTFCost + finalDeliveryCharge) - calculatedDiscount;

  // If any item was added from a 0 or negative stock variant, this is a backorder
  const hasBackorderItems = useMemo(() =>
    orderItems.some(item => item.stock <= 0),
    [orderItems]
  );

  const handleSubmit = () => {
    if (!customerName || !phone || (!isStorePickup && !address) || orderItems.length === 0) {
      return alert("Please fill in all customer details and add at least one item.");
    }

    if (isExchange) {
      if (!exchangeRefOrderId.trim() || !exchangeItemNote.trim()) {
        return alert("Please fill in the Original Order ID and Exchange Note.");
      }
    }

    const cityName = cities.find(c => c.value === selectedCityId?.toString())?.label || "";
    const zoneName = zones.find(z => z.value === selectedZoneId?.toString())?.label || "";
    const areaName = areas.find(a => a.value === selectedAreaId?.toString())?.label || "";

    const addressParts = [address];
    if (areaName) addressParts.push(areaName);
    if (zoneName) addressParts.push(zoneName);
    if (cityName) addressParts.push(cityName);

    const fullDeliveryAddress = isStorePickup
      ? (address || "Store Pickup")
      : (district === "Self Pickup"
        ? address
        : addressParts.filter(Boolean).map(p => p.trim()).join(", "));

    startTransition(async () => {
      try {
        const res = isExchange
          ? await createExchangeOrder({
            customerName,
            phone,
            district,
            address: fullDeliveryAddress,
            totalAmount,
            advancePaid,
            discountAmount: calculatedDiscount,
            remarks,
            pathaoCityId: selectedCityId || undefined,
            pathaoZoneId: selectedZoneId || undefined,
            pathaoAreaId: selectedAreaId || undefined,
            isStorePickup,
            deliveryCharge: isStorePickup ? deliveryCharge : finalDeliveryCharge,
            items: orderItems.map(item => ({
              productId: item.productId,
              size: item.size,
              quantity: item.quantity,
              price: item.price,
              requiresPrint: item.requiresPrint,
              printCost: item.printCost,
              printDetails: item.printDetails
            })),
            exchangeRefOrderId: exchangeRefOrderId.trim(),
            exchangeItemNote: exchangeItemNote.trim(),
            tags,
          })
          : await (orderAction ?? createAdminOrder)({
            customerName,
            phone,
            district,
            address: fullDeliveryAddress,
            totalAmount,
            advancePaid,
            discountAmount: calculatedDiscount,
            remarks,
            pathaoCityId: selectedCityId || undefined,
            pathaoZoneId: selectedZoneId || undefined,
            pathaoAreaId: selectedAreaId || undefined,
            isStorePickup,
            deliveryCharge: isStorePickup ? deliveryCharge : finalDeliveryCharge,
            items: orderItems.map(item => ({
              productId: item.productId,
              size: item.size,
              quantity: item.quantity,
              price: item.price,
              requiresPrint: item.requiresPrint,
              printCost: item.printCost,
              printDetails: item.printDetails
            })),
            hasBackorderItems,
            tags,
          });

        if (res.success) {
          router.push(successUrl);
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
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Customer Information</h2>
            </div>
            {/* Toggles on the right */}
            <div className="flex items-center gap-6">
              {/* Store Pickup Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isStorePickup}
                  onChange={(e) => {
                    setIsStorePickup(e.target.checked);
                    if (e.target.checked) {
                      setDistrict("Self Pickup");
                    } else {
                      setDistrict("Dhaka");
                    }
                  }}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Store Pickup</span>
              </label>

              {/* Exchange Order Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isExchange}
                  onChange={(e) => setIsExchange(e.target.checked)}
                  className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Exchange Order</span>
              </label>
            </div>
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
            {isStorePickup && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pickup Delivery Charge</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">৳</span>
                  <input
                    type="number"
                    min="0"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            {isExchange && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-orange-100 bg-orange-50/30 rounded-xl animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-orange-700 uppercase tracking-wider font-bold">Original Order ID *</label>
                  <input
                    type="text"
                    value={exchangeRefOrderId}
                    onChange={(e) => setExchangeRefOrderId(e.target.value.toUpperCase())}
                    placeholder="e.g. MJEPE-26052301"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-orange-700 uppercase tracking-wider font-bold">Exchange Note *</label>
                  <input
                    type="text"
                    value={exchangeItemNote}
                    onChange={(e) => setExchangeItemNote(e.target.value)}
                    placeholder="e.g. XL → XXL, Argentina Jersey"
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {!isStorePickup && (
              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select City *</label>
                  <CustomSelect
                    options={cities}
                    value={selectedCityId?.toString() || (district === "Self Pickup" ? "self-pickup" : "")}
                    onChange={(val) => {
                      if (val === "self-pickup") {
                        setSelectedCityId(null);
                        setSelectedZoneId(null);
                        setSelectedAreaId(null);
                        setDistrict("Self Pickup");
                      } else {
                        const id = parseInt(val);
                        setSelectedCityId(id);
                        setSelectedZoneId(null);
                        setSelectedAreaId(null);
                        const city = cities.find(c => c.value === val);
                        if (city) setDistrict(city.label);
                      }
                    }}
                    placeholder={loadingCities ? "Loading..." : "-- Select City --"}
                    searchable={true}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Zone</label>
                  <CustomSelect
                    options={zones}
                    value={selectedZoneId?.toString() || ""}
                    onChange={(val) => {
                      setSelectedZoneId(parseInt(val));
                      setSelectedAreaId(null);
                    }}
                    placeholder={loadingZones ? "Loading..." : (selectedCityId ? "-- Select Zone --" : "First select city")}
                    disabled={!selectedCityId || loadingZones}
                    searchable={true}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Area </label>
                  <CustomSelect
                    options={areas}
                    value={selectedAreaId?.toString() || ""}
                    onChange={(val) => setSelectedAreaId(parseInt(val))}
                    placeholder={loadingAreas ? "Loading..." : (selectedZoneId ? "-- Select Area --" : "First select zone")}
                    disabled={!selectedZoneId || loadingAreas}
                    searchable={true}
                  />
                </div>
              </div>
            )}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Address *</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="e.g., House 12, Road 4, Block C, Mirpur 2, Dhaka"
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Manual Discount</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    {manualDiscountType === "FLAT" ? "৳" : "%"}
                  </span>
                  <input
                    type="number"
                    value={manualDiscountValue}
                    onChange={e => setManualDiscountValue(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-4 py-2 bg-indigo-50/50 border border-indigo-100 rounded-lg text-sm font-bold text-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                    placeholder="0"
                  />
                </div>
                <select
                  value={manualDiscountType}
                  onChange={e => setManualDiscountType(e.target.value as "FLAT" | "PERCENTAGE")}
                  className="px-2 py-2 bg-indigo-50/50 border border-indigo-100 rounded-lg text-[10px] font-bold uppercase focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                >
                  <option value="FLAT">Flat</option>
                  <option value="PERCENTAGE">%</option>
                </select>
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
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Order Tags (Administrative)</label>
              <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all min-h-[42px]">
                {tags.map((tag, idx) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(idx)}
                      className="text-indigo-400 hover:text-indigo-600 focus:outline-none transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  placeholder={tags.length === 0 ? "Type tag name and press Enter or comma..." : "Add tag..."}
                  className="flex-1 bg-transparent border-0 p-0 text-sm focus:ring-0 outline-none placeholder:text-slate-400 min-w-[120px]"
                />
              </div>
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
                              <span className="text-sm font-mono font-black text-indigo-600">{formatBDT(p.price)}</span>
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
                    availableSizes.map(v => {
                      const isOutOfStock = v.stock <= 0;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setSelectedSize(v.size)}
                          className={`relative px-3 py-2 rounded-md border text-xs font-black transition-all ${selectedSize === v.size
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                            : isOutOfStock
                              ? "bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-400 hover:bg-orange-100"
                              : "bg-white border-slate-200 text-slate-700 hover:border-indigo-400"
                            }`}
                        >
                          {v.size}
                          <span className={`ml-1 text-[9px] ${selectedSize === v.size ? "text-indigo-200" : isOutOfStock ? "text-orange-400" : "text-slate-400"
                            }`}>
                            ({v.stock})
                          </span>
                          {isOutOfStock && (
                            <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[7px] font-black px-1 py-0 rounded-sm leading-tight">
                              OUT
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="h-9 flex items-center text-slate-400 text-xs italic">Select a product first</div>
                  )}
                </div>
                {selectedSize && availableSizes.find(v => v.size === selectedSize)?.stock <= 0 && (
                  <p className="mt-1.5 text-[10px] text-orange-600 font-bold flex items-center gap-1">
                    <span>⚠</span> Out of stock — admin override active. Stock will go negative.
                  </p>
                )}
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

              {/* DTF Print Section */}
              {selectedProductId && selectedSize && (
                <div className="md:col-span-12 pt-3 mt-2 border-t border-dashed border-slate-200">
                  <label className="inline-flex items-center gap-2 cursor-pointer group mb-2">
                    <input
                      type="checkbox"
                      checked={requiresPrint}
                      onChange={(e) => {
                        setRequiresPrint(e.target.checked);
                        if (e.target.checked && pendingPrintDetails.length === 0) {
                          setPendingPrintDetails([{ name: "", number: "" }]);
                        }
                      }}
                      className="rounded text-indigo-600  focus:ring-indigo-500 w-4 h-4"
                    />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors uppercase tracking-wide">
                      Add Jersey Customization (DTF) (+৳{dtfCostPerItem}/item)
                    </span>
                  </label>

                  {requiresPrint && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Customization Data</span>
                        <span className="text-[9px] font-bold text-slate-500 italic">Limit: {quantity} items</span>
                      </div>
                      <div className="space-y-2">
                        {pendingPrintDetails.map((detail, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-white p-1.5 rounded border border-slate-100 shadow-sm">
                            <div className="col-span-1 text-center">
                              <span className="text-[9px] font-black bg-slate-100 text-slate-500 w-4 h-4 inline-flex items-center justify-center rounded-full">
                                {idx + 1}
                              </span>
                            </div>
                            <div className="col-span-6">
                              <input
                                type="text"
                                placeholder="Name on jersey"
                                value={detail.name}
                                onChange={(e) => {
                                  const updated = [...pendingPrintDetails];
                                  updated[idx].name = e.target.value;
                                  setPendingPrintDetails(updated);
                                }}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-bold focus:outline-indigo-500"
                              />
                            </div>
                            <div className="col-span-4">
                              <input
                                type="text"
                                placeholder="00"
                                value={detail.number}
                                onChange={(e) => {
                                  const updated = [...pendingPrintDetails];
                                  updated[idx].number = e.target.value;
                                  setPendingPrintDetails(updated);
                                }}
                                className="w-full px-2 py-1 text-xs border border-slate-200 rounded font-bold focus:outline-indigo-500"
                              />
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setPendingPrintDetails(pendingPrintDetails.filter((_, i) => i !== idx))}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {pendingPrintDetails.length < quantity ? (
                        <button
                          type="button"
                          onClick={() => setPendingPrintDetails([...pendingPrintDetails, { name: "", number: "" }])}
                          className="text-[9px] font-black text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 px-2 py-1.5 rounded border border-indigo-100 flex items-center gap-1 w-fit transition-all mt-1"
                        >
                          <Plus className="w-3 h-3" /> Add Customization
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
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
                      <tr key={`${item.productId}-${item.size}`} className={`hover:bg-slate-50 transition-colors ${item.stock <= 0 ? "bg-orange-50/40" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          {item.stock <= 0 && (
                            <div className="mt-0.5 inline-block text-[9px] font-black text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded">⚠ BACKORDER</div>
                          )}
                          {item.requiresPrint && (
                            <div className="mt-1 space-y-0.5">
                              {(item.printDetails || []).map((pd, pidx) => (
                                <div key={pidx} className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded inline-block mr-1">
                                  {pd.name || "???"} {pd.number ? `${pd.number}` : ""}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center"><span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black">{item.size}</span></td>
                        <td className="px-4 py-3 text-center font-semibold">{item.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatBDT(item.price)}</td>
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
              <span className="font-mono font-bold text-slate-800">{formatBDT(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500">
              <span>Delivery Charge</span>
              <span className="font-mono font-bold text-slate-800">{formatBDT(finalDeliveryCharge)}</span>
            </div>
            {totalDTFCost > 0 && (
              <div className="flex justify-between text-sm text-indigo-600 font-medium">
                <span>DTF Customization Cost</span>
                <span className="font-mono font-bold">{formatBDT(totalDTFCost)}</span>
              </div>
            )}

            <div className="pt-4 border-t border-dashed border-slate-200 space-y-2">

              {calculatedDiscount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm ">Manual Discount</span>
                  <span className="text-lg font-bold font-mono">
                    - {formatBDT(calculatedDiscount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm">Advance Paid</span>
                <span className="text-lg font-bold font-mono">
                  - {formatBDT(advancePaid)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-tighter">Grand Total</span>
                <span className="text-lg font-bold text-slate-800 font-mono">
                  {formatBDT(totalAmount)}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-black text-slate-900 uppercase tracking-widest">Net Due</span>
                  <span className="text-2xl font-black text-indigo-600 font-mono tracking-tighter">
                    {formatBDT(totalAmount - advancePaid)}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium pt-1">Inclusive of all applicable taxes and charges</p>
            </div>

            <div className="pt-6 space-y-3">

              {
                hasBackorderItems && (
                  <div className="border-2 border-dashed border-orange-200 p-2 rounded-lg text-xs font-bold text-center ">
                    ⚠ This order contains backordered items.
                  </div>
                )
              }
              <button
                onClick={handleSubmit}
                disabled={isPending || orderItems.length === 0}
                className="w-full text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-200 bg-black hover:shadow-black/10 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed group">
                <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                CREATE ORDER
              </button>

              <Link
                href={backUrl}
                className="w-full h-12 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Discard & Back to List
              </Link>
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>SYSTEM ONLINE & READY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
