"use client";

import { useState, useMemo, useTransition, useCallback } from "react";
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  Trash2,
  CheckCircle,
  User,
  Phone,
  MapPin,
  ShoppingBag,
  Search,
  Edit3,
  AlertTriangle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Package,
  X,
  Zap,
  Check,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { createAdminOrder } from "../../actions";
import { useRouter } from "next/navigation";
import { formatBDT, roundPrice } from "@/utils/formatPrice";

// ─── Types ───────────────────────────────────────────────────────────────
interface ParsedItem {
  id: string;
  teamName: string;
  size: string;
  quantity: number;
  unitPrice: number;
  hasPrint: boolean;
  printName: string;
  printNumber: string;
  hasBadge: boolean;
  selectedProductId: string;
  selectedVariantSize: string;
}

interface ParsedOrder {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  items: ParsedItem[];
  deliveryCharge: number;
  printCost: number;
  badgeCost: number;
  totalBill: number;
  advance: number;
  totalPayable: number;
  deliveryType: string;
  remarks: string;
  status: "parsed" | "ready" | "creating" | "created" | "error";
  errorMessage?: string;
  createdOrderId?: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  team?: string;
  category: string;
  variants: { id: string; size: string; stock: number; color: string }[];
  discount?: { value: number; discountType: "FLAT" | "PERCENTAGE" } | null;
}

// ─── Component ───────────────────────────────────────────────────────────
export default function AICreateOrderClient({
  products,
  deliverySettings,
  dtfCostPerItem = 300,
}: {
  products: any[];
  deliverySettings: any;
  dtfCostPerItem?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ─── State ──────────────────────────────────────────────────
  const [rawText, setRawText] = useState("");
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [productSearches, setProductSearches] = useState<Record<string, string>>({});

  // ─── Parse with AI ──────────────────────────────────────────
  const handleParse = async () => {
    if (!rawText.trim()) return;
    setIsParsing(true);
    setParseError("");

    try {
      const res = await fetch("/api/ai/parse-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      const data = await res.json();

      if (!res.ok) {
        setParseError(data.error || "Failed to parse orders.");
        return;
      }

      setParsedOrders(data.orders);
      // Expand all cards by default
      setExpandedCards(new Set(data.orders.map((o: ParsedOrder) => o.id)));
    } catch (err: any) {
      setParseError(err.message || "Network error. Please try again.");
    } finally {
      setIsParsing(false);
    }
  };

  // ─── Update Order Field ─────────────────────────────────────
  const updateOrder = useCallback(
    (orderId: string, field: string, value: any) => {
      setParsedOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, [field]: value } : o))
      );
    },
    []
  );

  // ─── Update Item Field ──────────────────────────────────────
  const updateItem = useCallback(
    (orderId: string, itemId: string, field: string, value: any) => {
      setParsedOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                items: o.items.map((item) =>
                  item.id === itemId ? { ...item, [field]: value } : item
                ),
              }
            : o
        )
      );
    },
    []
  );

  // ─── Select Product for Item ────────────────────────────────
  const selectProductForItem = useCallback(
    (orderId: string, itemId: string, productId: string) => {
      const product = products.find((p: any) => p.id === productId);
      if (!product) return;

      const discountedPrice = getDiscountedPrice(product);

      setParsedOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                items: o.items.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        selectedProductId: productId,
                        unitPrice: discountedPrice,
                      }
                    : item
                ),
              }
            : o
        )
      );
      // Clear search for this item
      setProductSearches((prev) => ({ ...prev, [`${orderId}-${itemId}`]: "" }));
    },
    [products]
  );

  // ─── Delete Order Card ──────────────────────────────────────
  const deleteOrder = useCallback((orderId: string) => {
    setParsedOrders((prev) => prev.filter((o) => o.id !== orderId));
  }, []);

  // ─── Delete Item from Order ─────────────────────────────────
  const deleteItem = useCallback((orderId: string, itemId: string) => {
    setParsedOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, items: o.items.filter((item) => item.id !== itemId) }
          : o
      )
    );
  }, []);

  // ─── Toggle Card Expand ─────────────────────────────────────
  const toggleCard = useCallback((orderId: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  // ─── Price Helpers ──────────────────────────────────────────
  const getDiscountedPrice = (product: Product) => {
    if (!product.discount) return product.price;
    if (product.discount.discountType === "PERCENTAGE") {
      return roundPrice(product.price - (product.price * product.discount.value) / 100);
    }
    return roundPrice(product.price - product.discount.value);
  };

  // ─── Check if order is ready to create ──────────────────────
  const isOrderReady = (order: ParsedOrder): boolean => {
    if (order.status === "created") return false;
    if (!order.customerName.trim() || !order.phone.trim() || !order.address.trim()) return false;
    if (order.items.length === 0) return false;
    return order.items.every((item) => item.selectedProductId !== "");
  };

  // ─── Create Single Order ────────────────────────────────────
  const handleCreateOrder = async (order: ParsedOrder) => {
    if (!isOrderReady(order)) return;

    updateOrder(order.id, "status", "creating");

    try {
      // Build items for createAdminOrder
      const items = order.items.map((item) => {
        const product = products.find((p: any) => p.id === item.selectedProductId);
        const variant = product?.variants?.find(
          (v: any) => v.size === (item.selectedVariantSize || item.size)
        );

        const printDetails: { name: string; number: string }[] = [];
        if (item.hasPrint && item.printName) {
          printDetails.push({ name: item.printName, number: item.printNumber });
        }

        return {
          productId: item.selectedProductId,
          size: item.selectedVariantSize || item.size,
          quantity: item.quantity,
          price: item.unitPrice,
          requiresPrint: item.hasPrint,
          printCost: item.hasPrint ? dtfCostPerItem : 0,
          printDetails: printDetails.length > 0 ? printDetails : undefined,
        };
      });

      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const totalPrintCost = items.reduce((sum, item) => {
        if (!item.requiresPrint) return sum;
        const count = item.printDetails && item.printDetails.length > 0 ? item.printDetails.length : 1;
        return sum + count * (item.printCost || dtfCostPerItem);
      }, 0);
      const deliveryCharge = order.deliveryCharge || 0;
      const totalAmount = subtotal + totalPrintCost + deliveryCharge;

      const res = await createAdminOrder({
        customerName: order.customerName,
        phone: order.phone,
        district: deliveryCharge === 0 ? "Self Pickup" : "Outside Dhaka",
        address: order.address,
        totalAmount,
        advancePaid: order.advance,
        discountAmount: 0,
        remarks: order.remarks || `AI-parsed order | ${order.deliveryType}`,
        items,
        hasBackorderItems: false,
      });

      if (res.success) {
        setParsedOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? { ...o, status: "created", createdOrderId: res.orderId }
              : o
          )
        );
      } else {
        setParsedOrders((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? { ...o, status: "error", errorMessage: res.error || "Failed to create order" }
              : o
          )
        );
      }
    } catch (err: any) {
      setParsedOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, status: "error", errorMessage: err.message || "Unexpected error" }
            : o
        )
      );
    }
  };

  // ─── Create All Ready Orders ────────────────────────────────
  const handleCreateAll = async () => {
    const readyOrders = parsedOrders.filter((o) => isOrderReady(o));
    for (const order of readyOrders) {
      await handleCreateOrder(order);
    }
  };

  // ─── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = parsedOrders.length;
    const created = parsedOrders.filter((o) => o.status === "created").length;
    const ready = parsedOrders.filter((o) => isOrderReady(o)).length;
    const needsReview = total - created - parsedOrders.filter((o) => o.status === "error").length;
    const totalRevenue = parsedOrders.reduce((sum, o) => sum + o.totalPayable, 0);
    const totalItems = parsedOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
      0
    );
    return { total, created, ready, needsReview, totalRevenue, totalItems };
  }, [parsedOrders]);

  // ─── Product Search for a specific item ─────────────────────
  const getFilteredProducts = (searchKey: string): Product[] => {
    const query = productSearches[searchKey] || "";
    if (!query) return [];
    return products
      .filter(
        (p: any) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.team?.toLowerCase().includes(query.toLowerCase()) ||
          p.category?.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 6);
  };

  // ─── RENDER ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-500" />
              AI Order Creator
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Paste WhatsApp order messages • AI parses them into orders
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ LEFT COLUMN ═══ */}
        <div className="lg:col-span-2 space-y-6">
          {/* ─── Text Input Card ─── */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-indigo-50 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Paste Order Messages
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste your WhatsApp order messages here...&#10;&#10;Example:&#10;Order Confirmed ✅&#10;• Team & Size: Brazil Home; Size: XL&#10;• Full Name: Fahim&#10;• Phone Number: 01743704140&#10;• Delivery Address: কিশোরগঞ্জ হোসেন পুর..."
                rows={10}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm leading-relaxed focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-y font-mono"
              />

              {parseError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{parseError}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleParse}
                  disabled={isParsing || !rawText.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-violet-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-200 active:scale-[0.98]"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      AI is parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Parse with AI
                    </>
                  )}
                </button>

                {parsedOrders.length > 0 && (
                  <button
                    onClick={() => {
                      setParsedOrders([]);
                      setParseError("");
                    }}
                    className="flex items-center gap-1.5 px-4 py-3 text-slate-500 hover:text-slate-700 text-sm font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear Results
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ─── Parsing Animation ─── */}
          {isParsing && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-200 animate-pulse">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -inset-1 bg-gradient-to-br from-violet-500/20 to-indigo-600/20 rounded-2xl blur-xl animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">AI is analyzing your messages...</p>
                <p className="text-xs text-slate-500 mt-1">
                  Extracting customer info, products, sizes, and pricing
                </p>
              </div>
            </div>
          )}

          {/* ─── Parsed Order Cards ─── */}
          {parsedOrders.length > 0 && !isParsing && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-violet-500" />
                  Parsed Orders ({parsedOrders.length})
                </h3>
              </div>

              {parsedOrders.map((order, orderIdx) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  orderIdx={orderIdx}
                  isExpanded={expandedCards.has(order.id)}
                  onToggle={() => toggleCard(order.id)}
                  onDelete={() => deleteOrder(order.id)}
                  onUpdateOrder={updateOrder}
                  onUpdateItem={updateItem}
                  onDeleteItem={deleteItem}
                  onSelectProduct={selectProductForItem}
                  onCreateOrder={() => handleCreateOrder(order)}
                  isReady={isOrderReady(order)}
                  products={products}
                  productSearches={productSearches}
                  setProductSearches={setProductSearches}
                  getFilteredProducts={getFilteredProducts}
                  getDiscountedPrice={getDiscountedPrice}
                  dtfCostPerItem={dtfCostPerItem}
                />
              ))}
            </div>
          )}
        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            {/* Summary Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest">AI Summary</h2>
                <Zap className="w-4 h-4 text-yellow-400" />
              </div>

              <div className="p-6 space-y-4">
                {parsedOrders.length === 0 ? (
                  <div className="text-center py-6">
                    <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-medium">
                      Paste messages & click "Parse with AI"
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-slate-900">{stats.total}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Orders
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-slate-900">{stats.totalItems}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Items
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-emerald-600">{stats.created}</p>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                          Created
                        </p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-black text-amber-600">{stats.ready}</p>
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">
                          Ready
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-500 font-medium">Total Revenue</span>
                        <span className="text-lg font-black text-slate-900 font-mono">
                          {formatBDT(stats.totalRevenue)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 space-y-3">
                      <button
                        onClick={handleCreateAll}
                        disabled={stats.ready === 0 || isPending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-200 hover:from-emerald-700 hover:to-green-700 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                      >
                        {isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        CREATE ALL READY ({stats.ready})
                      </button>

                      <Link
                        href="/admin/orders"
                        className="w-full h-12 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Orders
                      </Link>
                    </div>
                  </>
                )}
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  <span>AI ENGINE POWERED BY GEMINI</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// ─── ORDER CARD COMPONENT ────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════
function OrderCard({
  order,
  orderIdx,
  isExpanded,
  onToggle,
  onDelete,
  onUpdateOrder,
  onUpdateItem,
  onDeleteItem,
  onSelectProduct,
  onCreateOrder,
  isReady,
  products,
  productSearches,
  setProductSearches,
  getFilteredProducts,
  getDiscountedPrice,
  dtfCostPerItem,
}: {
  order: ParsedOrder;
  orderIdx: number;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateOrder: (id: string, field: string, value: any) => void;
  onUpdateItem: (orderId: string, itemId: string, field: string, value: any) => void;
  onDeleteItem: (orderId: string, itemId: string) => void;
  onSelectProduct: (orderId: string, itemId: string, productId: string) => void;
  onCreateOrder: () => void;
  isReady: boolean;
  products: any[];
  productSearches: Record<string, string>;
  setProductSearches: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  getFilteredProducts: (searchKey: string) => any[];
  getDiscountedPrice: (product: any) => number;
  dtfCostPerItem: number;
}) {
  const statusConfig = {
    parsed: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-700",
      label: "Needs Review",
      icon: <Edit3 className="w-3 h-3" />,
    },
    ready: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      badge: "bg-emerald-100 text-emerald-700",
      label: "Ready",
      icon: <Check className="w-3 h-3" />,
    },
    creating: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-700",
      label: "Creating...",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    created: {
      bg: "bg-emerald-50",
      border: "border-emerald-300",
      badge: "bg-emerald-500 text-white",
      label: "Created ✓",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      badge: "bg-red-100 text-red-700",
      label: "Error",
      icon: <AlertTriangle className="w-3 h-3" />,
    },
  };

  const effectiveStatus =
    order.status === "parsed" && isReady ? "ready" : order.status;
  const config = statusConfig[effectiveStatus] || statusConfig.parsed;

  const allProductsSelected = order.items.every(
    (item) => item.selectedProductId !== ""
  );

  return (
    <div
      className={`rounded-xl border-2 ${config.border} ${config.bg} overflow-hidden transition-all duration-200 ${
        order.status === "created" ? "opacity-70" : ""
      }`}
    >
      {/* Card Header */}
      <div
        className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-white/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-sm font-black text-slate-600 shadow-sm">
            {orderIdx + 1}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
              {order.customerName || "Unknown Customer"}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide ${config.badge}`}
              >
                {config.icon}
                {config.label}
              </span>
            </p>
            <p className="text-xs text-slate-500 font-mono">{order.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-900 font-mono">
            {formatBDT(order.totalPayable)}
          </span>
          {order.status !== "created" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Card Body */}
      {isExpanded && (
        <div className="border-t border-slate-200/60 bg-white">
          <div className="p-5 space-y-5">
            {/* ─── Customer Info ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Customer Name
                </label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={order.customerName}
                    onChange={(e) =>
                      onUpdateOrder(order.id, "customerName", e.target.value)
                    }
                    disabled={order.status === "created"}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={order.phone}
                    onChange={(e) =>
                      onUpdateOrder(order.id, "phone", e.target.value)
                    }
                    disabled={order.status === "created"}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-medium focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Delivery Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={order.address}
                    onChange={(e) =>
                      onUpdateOrder(order.id, "address", e.target.value)
                    }
                    disabled={order.status === "created"}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* ─── Items ─── */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShoppingBag className="w-3 h-3" />
                Items ({order.items.length})
              </h4>

              {order.items.map((item) => {
                const searchKey = `${order.id}-${item.id}`;
                const selectedProduct = products.find(
                  (p: any) => p.id === item.selectedProductId
                );
                const filteredProds = getFilteredProducts(searchKey);

                return (
                  <div
                    key={item.id}
                    className="bg-slate-50 rounded-lg border border-slate-100 p-3 space-y-3"
                  >
                    {/* Item Header: AI parsed info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-700">
                          {item.teamName}{" "}
                          <span className="text-[10px] font-mono bg-slate-200 px-1.5 py-0.5 rounded ml-1">
                            {item.size}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2">
                            × {item.quantity}
                          </span>
                        </p>
                        {item.hasPrint && (
                          <p className="text-[10px] text-indigo-600 font-bold mt-0.5">
                            🖨️ Print: {item.printName} {item.printNumber}
                          </p>
                        )}
                        {item.hasBadge && (
                          <p className="text-[10px] text-amber-600 font-bold mt-0.5">
                            🏅 Badge
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {formatBDT(item.unitPrice * item.quantity)}
                        </span>
                        {order.status !== "created" && (
                          <button
                            onClick={() => onDeleteItem(order.id, item.id)}
                            className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Product Selector */}
                    {order.status !== "created" && (
                      <div className="relative">
                        {selectedProduct ? (
                          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                            <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-emerald-800 truncate">
                                {selectedProduct.name}
                              </p>
                              <p className="text-[10px] text-emerald-600">
                                {formatBDT(getDiscountedPrice(selectedProduct))} •{" "}
                                {item.selectedVariantSize || item.size}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                onSelectProduct(order.id, item.id, "")
                              }
                              className="p-1 text-emerald-400 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="text"
                                value={productSearches[searchKey] || ""}
                                onChange={(e) =>
                                  setProductSearches((prev: Record<string, string>) => ({
                                    ...prev,
                                    [searchKey]: e.target.value,
                                  }))
                                }
                                placeholder={`Search product for "${item.teamName}"...`}
                                className="w-full pl-8 pr-3 py-2 bg-white border-2 border-dashed border-amber-300 rounded-lg text-xs font-medium focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all placeholder:text-amber-400"
                              />
                            </div>

                            {/* Search Results */}
                            {filteredProds.length > 0 && (
                              <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-10 relative">
                                <div className="max-h-[140px] overflow-y-auto">
                                  {filteredProds.map((p: any) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() =>
                                        onSelectProduct(order.id, item.id, p.id)
                                      }
                                      className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-violet-50 transition-colors border-b border-slate-50 last:border-0"
                                    >
                                      <div className="w-7 h-7 rounded bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                                        {p.images?.[0] ? (
                                          <img
                                            src={p.images[0]}
                                            alt=""
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[7px] text-slate-400 font-bold">
                                            IMG
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 truncate">
                                          {p.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                          {p.team || p.category} •{" "}
                                          {formatBDT(getDiscountedPrice(p))}
                                        </p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Size Selection after product is selected */}
                        {selectedProduct && selectedProduct.variants?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {selectedProduct.variants
                              .sort((a: any, b: any) => a.order - b.order)
                              .map((v: any) => {
                                const isSelected =
                                  (item.selectedVariantSize || item.size) === v.size;
                                return (
                                  <button
                                    key={v.id}
                                    type="button"
                                    onClick={() =>
                                      onUpdateItem(
                                        order.id,
                                        item.id,
                                        "selectedVariantSize",
                                        v.size
                                      )
                                    }
                                    className={`px-2 py-1 rounded text-[10px] font-black border transition-all ${
                                      isSelected
                                        ? "bg-violet-600 border-violet-600 text-white"
                                        : v.stock <= 0
                                        ? "bg-orange-50 border-orange-200 text-orange-600"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-violet-400"
                                    }`}
                                  >
                                    {v.size}
                                    <span className="ml-0.5 opacity-60">({v.stock})</span>
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Editable quantity and price */}
                    {order.status !== "created" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-black text-slate-400 uppercase">
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              onUpdateItem(
                                order.id,
                                item.id,
                                "quantity",
                                parseInt(e.target.value) || 1
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold text-center focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-black text-slate-400 uppercase">
                            Unit ৳
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) =>
                              onUpdateItem(
                                order.id,
                                item.id,
                                "unitPrice",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold font-mono text-center focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── Bill Breakdown ─── */}
            <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 space-y-2">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Bill Summary
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Bill</span>
                  <input
                    type="number"
                    value={order.totalBill}
                    onChange={(e) =>
                      onUpdateOrder(
                        order.id,
                        "totalBill",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    disabled={order.status === "created"}
                    className="w-24 px-2 py-0.5 bg-white border border-slate-200 rounded text-right font-mono font-bold focus:ring-2 focus:ring-violet-500/20 text-xs disabled:opacity-50"
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Delivery</span>
                  <input
                    type="number"
                    value={order.deliveryCharge}
                    onChange={(e) =>
                      onUpdateOrder(
                        order.id,
                        "deliveryCharge",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    disabled={order.status === "created"}
                    className="w-24 px-2 py-0.5 bg-white border border-slate-200 rounded text-right font-mono font-bold focus:ring-2 focus:ring-violet-500/20 text-xs disabled:opacity-50"
                  />
                </div>
                {order.printCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-indigo-600 font-medium">Print Cost</span>
                    <span className="font-mono font-bold text-indigo-600">
                      {formatBDT(order.printCost)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-red-600">
                  <span className="font-medium">Advance</span>
                  <input
                    type="number"
                    value={order.advance}
                    onChange={(e) =>
                      onUpdateOrder(
                        order.id,
                        "advance",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    disabled={order.status === "created"}
                    className="w-24 px-2 py-0.5 bg-red-50 border border-red-200 rounded text-right font-mono font-bold focus:ring-2 focus:ring-red-500/20 text-xs text-red-600 disabled:opacity-50"
                  />
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-black text-slate-800 uppercase text-[10px] tracking-wider">
                    Payable
                  </span>
                  <input
                    type="number"
                    value={order.totalPayable}
                    onChange={(e) =>
                      onUpdateOrder(
                        order.id,
                        "totalPayable",
                        parseFloat(e.target.value) || 0
                      )
                    }
                    disabled={order.status === "created"}
                    className="w-24 px-2 py-0.5 bg-white border-2 border-slate-300 rounded text-right font-mono font-black focus:ring-2 focus:ring-violet-500/20 text-sm disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* ─── Error Message ─── */}
            {order.status === "error" && order.errorMessage && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{order.errorMessage}</p>
              </div>
            )}

            {/* ─── Created Success ─── */}
            {order.status === "created" && order.createdOrderId && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">
                    Order Created Successfully!
                  </p>
                  <p className="text-[10px] text-emerald-600 font-mono">
                    ID: {order.createdOrderId}
                  </p>
                </div>
              </div>
            )}

            {/* ─── Action Button ─── */}
            {order.status !== "created" && (
              <div className="flex gap-2">
                {!allProductsSelected && (
                  <p className="flex-1 text-[10px] text-amber-600 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Select products for all items to enable creation
                  </p>
                )}
                <button
                  onClick={onCreateOrder}
                  disabled={!isReady || order.status === "creating"}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs font-black rounded-lg hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-sm ml-auto"
                >
                  {order.status === "creating" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  CREATE ORDER
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
