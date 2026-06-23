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
  ChartArea,
} from "lucide-react";
import Link from "next/link";
import { createAdminOrder } from "../actions";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  isStorePickup?: boolean;
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

      setParsedOrders(autoSelectParsedOrders(data.orders));
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
      if (!productId) {
        setParsedOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                ...o,
                items: o.items.map((item) =>
                  item.id === itemId
                    ? {
                      ...item,
                      selectedProductId: "",
                      selectedVariantSize: "",
                    }
                    : item
                ),
              }
              : o
          )
        );
        setProductSearches((prev) => ({ ...prev, [`${orderId}-${itemId}`]: "" }));
        return;
      }

      const product = products.find((p: any) => p.id === productId);
      if (!product) return;

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
                    selectedVariantSize:
                      item.selectedVariantSize ||
                      getMatchingVariantSize(product, item.size),
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

  const normalizeProductText = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\u0980-\u09ff]+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

  const levenshteinDistance = (left: string, right: string) => {
    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;

    let previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

    for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
      const currentRow = [leftIndex + 1];

      for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
        const insertionCost = currentRow[rightIndex] + 1;
        const deletionCost = previousRow[rightIndex + 1] + 1;
        const substitutionCost = previousRow[rightIndex] + (left[leftIndex] === right[rightIndex] ? 0 : 1);
        currentRow.push(Math.min(insertionCost, deletionCost, substitutionCost));
      }

      previousRow = currentRow;
    }

    return previousRow[previousRow.length - 1];
  };

  const getProductMatchScore = (query: string, product: Product) => {
    const normalizedQuery = normalizeProductText(query);
    if (!normalizedQuery) return 0;

    const productTexts = [product.name, product.team || "", product.category || ""]
      .map(normalizeProductText)
      .filter(Boolean);

    if (productTexts.some((text) => text === normalizedQuery)) return 1;
    if (productTexts.some((text) => text.includes(normalizedQuery) || normalizedQuery.includes(text))) return 0.95;

    const combinedProductText = productTexts.join(" ");
    const queryTokens = normalizedQuery.split(" ").filter(Boolean);
    const productTokens = combinedProductText.split(" ").filter(Boolean);
    const tokenHits = queryTokens.filter((token) =>
      productTokens.some((productToken) => productToken.includes(token) || token.includes(productToken))
    ).length;
    const tokenScore = queryTokens.length > 0 ? tokenHits / queryTokens.length : 0;

    const distance = levenshteinDistance(normalizedQuery, combinedProductText);
    const similarity = 1 - distance / Math.max(normalizedQuery.length, combinedProductText.length, 1);

    return Math.max(tokenScore, similarity);
  };

  const getPriceMatchScore = (quotedPrice: number, catalogPrice: number) => {
    if (quotedPrice <= 0 || catalogPrice <= 0) return 0.5;
    const diff = Math.abs(catalogPrice - quotedPrice);
    const baseline = Math.max(quotedPrice, catalogPrice, 1);
    return Math.max(0, 1 - diff / baseline);
  };

  const getBestMatchingProduct = (query: string, quotedPrice: number) => {
    let bestProduct: Product | null = null;
    let bestScore = 0;

    for (const product of products as Product[]) {
      const textScore = getProductMatchScore(query, product);
      if (textScore < 0.55) continue;

      const catalogPrice = getDiscountedPrice(product);
      const priceScore = getPriceMatchScore(quotedPrice, catalogPrice);
      const score = textScore * 0.7 + priceScore * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestProduct = product;
      }
    }

    return bestScore >= 0.72 ? bestProduct : null;
  };

  const getMatchingVariantSize = (product: Product, size: string) => {
    const normalizedSize = normalizeProductText(size).toUpperCase();
    const exactMatch = product.variants?.find(
      (variant) => normalizeProductText(variant.size).toUpperCase() === normalizedSize
    );
    return exactMatch?.size || "";
  };

  const autoSelectParsedOrders = (orders: ParsedOrder[]) => {
    return orders.map((order) => ({
      ...order,
      items: order.items.map((item) => {
        if (item.selectedProductId) return item;

        const matchedProduct = getBestMatchingProduct(item.teamName, item.unitPrice);
        if (!matchedProduct) return item;

        return {
          ...item,
          selectedProductId: matchedProduct.id,
          selectedVariantSize: item.selectedVariantSize || getMatchingVariantSize(matchedProduct, item.size),
        };
      }),
    }));
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
          variantId: variant?.id || "",
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
        remarks: order.remarks,
        items,
        hasBackorderItems: false,
        isStorePickup: order.isStorePickup ?? false,
        deliveryCharge: order.deliveryCharge ?? 0,
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
    <div className="space-y-4 lg:min-h-[calc(100vh-6rem)]">
      {isParsing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
              <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">AI is parsing your message</p>
              <p className="text-xs text-slate-500">
                Please wait while we extract the order details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex justify-between items-center gap-3">
          <Link
            href="/admin/orders"
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-slate-500" />
              AI Order Creator
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Paste order messages • AI parses them into orders
            </p>
          </div>


        </div>
        <Link
          href="/admin/orders"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to orders
        </Link>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900">AI Summary</h2>
            </div>
            <p className="text-xs text-slate-500">
              Compact order status, ready count, and creation controls.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-1 lg:justify-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center min-w-[84px]">
              <p className="text-lg font-semibold text-slate-900">{stats.total}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Orders</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center min-w-[84px]">
              <p className="text-lg font-semibold text-slate-900">{stats.totalItems}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Items</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center min-w-[84px]">
              <p className="text-lg font-semibold text-slate-900">{stats.ready}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Ready</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center min-w-[84px]">
              <p className="text-lg font-semibold text-slate-900">{formatBDT(stats.totalRevenue)}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Revenue</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <button
              onClick={handleCreateAll}
              disabled={stats.ready === 0 || isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Create all ready ({stats.ready})
            </button>


          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.15fr)] lg:items-stretch">
        {/* ═══ LEFT COLUMN ═══ */}
        <div className="space-y-4 h-full min-h-0 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto lg:pr-2">

          {/* ─── Text Input Card ─── */}
          <div className="h-full rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col">

            <div className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex-1 min-h-[320px]">
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Get customer order messages and paste them here..."
                  rows={12}
                  className="h-full min-h-[320px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm leading-relaxed text-slate-700 transition-colors focus:border-slate-400 focus:bg-white focus:outline-none"
                />
              </div>

              {parseError && (
                <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <AlertTriangle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-slate-700">{parseError}</p>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={handleParse}
                  disabled={isParsing || !rawText.trim()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Parse messages
                    </>
                  )}
                </button>

                {parsedOrders.length > 0 && (
                  <button
                    onClick={() => {
                      setParsedOrders([]);
                      setParseError("");
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Clear results
                  </button>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ═══ RIGHT COLUMN ═══ */}
        <div className="space-y-4 h-full min-h-0 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto lg:pr-2">
          {/* ─── Parsed Order Cards ─── */}
          {parsedOrders.length > 0 && !isParsing && (
            <div className="space-y-4 pb-4">


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

          {parsedOrders.length === 0 && !isParsing && (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
              <div className="space-y-2 max-w-sm">
                <p className="text-sm font-medium text-slate-900">No parsed orders yet</p>
                <p className="text-xs text-slate-500">
                  Paste messages on the left to see orders appear here.
                </p>
              </div>
            </div>
          )}
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
      bg: "bg-white",
      border: "border-slate-200",
      badge: "border-slate-200 bg-slate-50 text-slate-600",
      label: "Needs Review",
      icon: <Edit3 className="w-3 h-3" />,
    },
    ready: {
      bg: "bg-slate-50",
      border: "border-slate-200",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      label: "Ready",
      icon: <Check className="w-3 h-3" />,
    },
    creating: {
      bg: "bg-white",
      border: "border-slate-200",
      badge: "border-slate-200 bg-slate-50 text-slate-600",
      label: "Creating...",
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
    },
    created: {
      bg: "bg-white",
      border: "border-slate-200",
      badge: "border-slate-200 bg-slate-100 text-slate-700",
      label: "Created ✓",
      icon: <CheckCircle className="w-3 h-3" />,
    },
    error: {
      bg: "bg-white",
      border: "border-slate-200",
      badge: "border-rose-200 bg-rose-50 text-rose-700",
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
      className={`rounded-2xl border ${config.border} ${config.bg} overflow-hidden transition-colors duration-200 ${order.status === "created" ? "opacity-70" : ""
        }`}
    >
      {/* Card Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-sm font-semibold text-slate-700">
            {orderIdx + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              {order.customerName || "Unknown Customer"}
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.16em] ${config.badge}`}
              >
                {config.icon}
                {config.label}
              </span>
            </p>
            <p className="text-xs text-slate-500 font-mono">{order.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900 font-mono">
            {formatBDT(order.totalPayable)}
          </span>
          {order.status !== "created" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 text-slate-300 hover:text-slate-700 transition-colors"
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
        <div className="border-t border-slate-200 bg-white">
          <div className="p-4 space-y-4">
            {/* ─── Customer Info ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
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
                    className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm font-medium text-slate-700 transition-colors focus:border-slate-400 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
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
                    className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm font-mono font-medium text-slate-700 transition-colors focus:border-slate-400 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
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
                    className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-sm font-medium text-slate-700 transition-colors focus:border-slate-400 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* ─── Items ─── */}
            <div className="space-y-3">
              <h4 className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
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
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3"
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
                          <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                            🖨️ Print: {item.printName} {item.printNumber}
                          </p>
                        )}
                        {item.hasBadge && (
                          <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                            🏅 Badge
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {formatBDT(item.unitPrice * item.quantity)}
                        </span>
                        {order.status !== "created" && order.items.length > 1 && (
                          <button
                            onClick={() => onDeleteItem(order.id, item.id)}
                            className="p-1 text-slate-300 hover:text-slate-700 transition-colors"
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
                          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <Check className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {selectedProduct.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {formatBDT(getDiscountedPrice(selectedProduct))} •{" "}
                                {item.selectedVariantSize || item.size}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                onSelectProduct(order.id, item.id, "")
                              }
                              className="p-1 text-slate-300 hover:text-slate-700 transition-colors"
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
                                className="w-full rounded-lg border border-dashed border-slate-300 bg-white pl-8 pr-3 py-2 text-xs font-medium text-slate-700 transition-colors focus:border-slate-400 focus:outline-none placeholder:text-slate-400"
                              />
                            </div>

                            {/* Search Results */}
                            {filteredProds.length > 0 && (
                              <div className="relative z-10 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <div className="max-h-[140px] overflow-y-auto">
                                  {filteredProds.map((p: any) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() =>
                                        onSelectProduct(order.id, item.id, p.id)
                                      }
                                      className="w-full border-b border-slate-100 px-3 py-2 text-left transition-colors hover:bg-slate-50 last:border-0 flex items-center gap-2"
                                    >
                                      <div className="w-7 h-7 rounded bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                                        {p.images?.[0] ? (
                                          <Image
                                            src={p.images[0]}
                                            alt=""
                                            width={28}
                                            height={28}
                                            className="object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[7px] text-slate-400 font-bold">
                                            IMG
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-slate-800 truncate">
                                          {p.name}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
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
                                    className={`px-2 py-1 rounded text-[10px] font-black border transition-all ${isSelected
                                      ? "bg-slate-900 border-slate-900 text-white"
                                      : v.stock <= 0
                                        ? "bg-slate-100 border-slate-200 text-slate-400"
                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
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
                          <label className="text-[8px] font-semibold text-slate-400 uppercase">
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
                            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-center text-xs font-semibold text-slate-700 focus:border-slate-400 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <label className="text-[8px] font-semibold text-slate-400 uppercase">
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
                            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-center text-xs font-semibold font-mono text-slate-700 focus:border-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ─── Bill Breakdown ─── */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <h4 className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
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
                    className="w-24 rounded border border-slate-200 bg-white px-2 py-0.5 text-right font-mono text-xs font-semibold text-slate-700 focus:border-slate-400 focus:outline-none disabled:opacity-50"
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
                    className="w-24 rounded border border-slate-200 bg-white px-2 py-0.5 text-right font-mono text-xs font-semibold text-slate-700 focus:border-slate-400 focus:outline-none disabled:opacity-50"
                  />
                </div>
                {order.printCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Print Cost</span>
                    <span className="font-mono font-semibold text-slate-700">
                      {formatBDT(order.printCost)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
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
                    className="w-24 rounded border border-slate-200 bg-white px-2 py-0.5 text-right font-mono text-xs font-semibold text-slate-700 focus:border-slate-400 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200">
                  <span className="font-semibold text-slate-800 uppercase text-[10px] tracking-wider">
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
                    className="w-24 rounded border border-slate-300 bg-white px-2 py-0.5 text-right font-mono text-sm font-semibold text-slate-700 focus:border-slate-400 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {/* ─── Error Message ─── */}
            {order.status === "error" && order.errorMessage && (
              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <AlertTriangle className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-slate-700">{order.errorMessage}</p>
              </div>
            )}

            {/* ─── Created Success ─── */}
            {order.status === "created" && order.createdOrderId && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <CheckCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Order Created Successfully!
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    ID: {order.createdOrderId}
                  </p>
                </div>
              </div>
            )}

            {/* ─── Action Button ─── */}
            {order.status !== "created" && (
              <div className="flex gap-2">
                {!allProductsSelected && (
                  <p className="flex-1 text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Select products for all items to enable creation
                  </p>
                )}
                <button
                  onClick={onCreateOrder}
                  disabled={!isReady || order.status === "creating"}
                  className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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
