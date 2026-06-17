"use client";

import { useState, useEffect } from "react";
import {
  Edit2, Check, X, Package, Trash2, Plus, Copy,
  Compass, CheckCircle2, Truck, PackageCheck, Printer,
  AlertCircle, Minus, VerifiedIcon, Loader2,
  CalendarDays, ArrowLeft, Download, Receipt, MapPin,
  ClipboardList, Tag, User, ArrowRightLeft, Activity,
  ChevronDown, ChevronUp
} from "lucide-react";
import { updateOrderDetails, updateOrderRemark, updateOrderStatus, requestOrderCancellation } from "../actions";
import { getPathaoCities, getPathaoZones, getPathaoAreas, getPathaoOrderInfoAction } from "@/app/actions/pathao";
import { getProductsForOrder } from "@/app/admin/products/actions";
import { HoldReasonModal } from "@/components/HoldReasonModal";
import { CancelReasonModal } from "@/components/CancelReasonModal";
import InvoicePrintView from "../InvoicePrintView";
import ThermalPrintView from "../ThermalPrintView";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UploadedImage from "@/components/UploadedImage";
import { CustomSelect } from "@/components/CustomSelect";
import { formatBDT, roundPrice } from "@/utils/formatPrice";
import { validateStatusTransition } from "@/lib/utils";
import type { OrderStatus } from "@/generated/prisma/client";

interface StaffMember {
  id: string;
  username: string;
  role: {
    name: string;
  } | null;
}

const formatValue = (val: any, fieldKey?: string) => {
  if (val === null || val === undefined) return "None";
  if (Array.isArray(val)) {
    if (val.length === 0) return "None";
    if (fieldKey === "items" || (val[0] && typeof val[0] === "object" && "productId" in val[0])) {
      return val.map((item: any) => {
        const name = item.product?.name || item.productName || `Product (${item.productId?.slice(0, 8) || "Unknown"})`;
        const sizeInfo = (item.variant?.size || item.size) ? ` (${item.variant?.size || item.size})` : "";
        const printInfo = item.requiresPrint ? ` [Print: ${item.printName || "No Name"}/${item.printNumber || "No No"}]` : "";
        return `${item.quantity}x ${name}${sizeInfo} @ ৳${item.price}${printInfo}`;
      }).join("\n");
    }
    if (typeof val[0] === "object") {
      return JSON.stringify(val, null, 2);
    }
    return val.join(", ");
  }
  if (typeof val === "object") {
    return JSON.stringify(val, null, 2);
  }
  return String(val);
};

const cleanForCompare = (val: any): any => {
  if (val === null || val === undefined) return val;
  if (Array.isArray(val)) {
    return val.map(cleanForCompare);
  }
  if (typeof val === "object" && !(val instanceof Date)) {
    const cleaned: any = {};
    for (const key of Object.keys(val)) {
      if (key === "id" || key === "createdAt" || key === "updatedAt" || key === "orderId") {
        continue;
      }
      cleaned[key] = cleanForCompare(val[key]);
    }
    return cleaned;
  }
  return val;
};


export default function OrderDetailsClient({
  order,
  deliverySettings,
  products = [],
  pathaoInfo = null,
  dtfSetting = { printCost: 250 },
  staff = [],
  backUrl = "/admin/orders",
  commissionInfo = null,
  activityLogs = [],
  cancellationRequest = null,
  staffSession = null,
}: {
  order: any;
  deliverySettings: any;
  products?: any[];
  pathaoInfo?: any;
  dtfSetting?: any;
  staff?: StaffMember[];
  backUrl?: string;
  commissionInfo?: { rate: number; amount: number; orderStatus: string } | null;
  activityLogs?: any[];
  cancellationRequest?: any;
  staffSession?: any;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remarkLoading, setRemarkLoading] = useState(false);
  const [isEditingRemark, setIsEditingRemark] = useState(false);
  const [remarks, setRemarks] = useState(order.remarks || "");
  const [copied, setCopied] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [tagsFormData, setTagsFormData] = useState<string[]>(order.tags || []);
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);
  const [printType, setPrintType] = useState<"A4" | "80MM" | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const [pathaoInfoState, setPathaoInfoState] = useState<any>(pathaoInfo);
  const [loadingPathao, setLoadingPathao] = useState(false);
  const [localProducts, setLocalProducts] = useState<any[]>(products || []);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cancelRequest, setCancelRequest] = useState<any>(cancellationRequest);
  const [cancelRequestLoading, setCancelRequestLoading] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const toggleLogExpanded = (logId: string) => {
    setExpandedLogs((prev) => ({ ...prev, [logId]: !prev[logId] }));
  };

  const getDiffDetails = (log: any) => {
    if (!log.dataBefore || !log.dataAfter) return null;
    try {
      const before = typeof log.dataBefore === "string" ? JSON.parse(log.dataBefore) : log.dataBefore;
      const after = typeof log.dataAfter === "string" ? JSON.parse(log.dataAfter) : log.dataAfter;

      const diffs = [];
      const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
      const ignoreKeys = ["createdAt", "updatedAt", "id"];

      for (const key of allKeys) {
        if (ignoreKeys.includes(key)) continue;
        const valBefore = before[key];
        const valAfter = after[key];

        const cleanBefore = cleanForCompare(valBefore);
        const cleanAfter = cleanForCompare(valAfter);

        const match = typeof cleanBefore === "object" && typeof cleanAfter === "object"
          ? JSON.stringify(cleanBefore) === JSON.stringify(cleanAfter)
          : String(cleanBefore) === String(cleanAfter);

        if (!match) {
          diffs.push({
            field: key,
            oldVal: valBefore,
            newVal: valAfter
          });
        }
      }
      return diffs;
    } catch (e) {
      console.error("[OrderDetailsClient] Failed to calculate diff details:", e);
      return null;
    }
  };

  useEffect(() => {
    setStatus(order.status);
  }, [order.status]);

  // Load products client-side when entering editing mode
  useEffect(() => {
    if (isEditing && localProducts.length === 0) {
      async function fetchProducts() {
        setLoadingProducts(true);
        try {
          const res = await getProductsForOrder();
          setLocalProducts(res || []);
        } catch (e) {
          console.error("[OrderDetailsClient] Failed to fetch products client-side:", e);
        }
        setLoadingProducts(false);
      }
      fetchProducts();
    }
  }, [isEditing, localProducts.length]);

  // Load Pathao consignment info client-side in the background
  useEffect(() => {
    if (order.status === "SHIPPED" && order.pathaoConsignmentId && !pathaoInfoState) {
      async function fetchPathaoInfo() {
        setLoadingPathao(true);
        try {
          const res = await getPathaoOrderInfoAction(order.pathaoConsignmentId);
          if (res.success && res.data) {
            setPathaoInfoState(res.data);
          }
        } catch (e) {
          console.error("[OrderDetailsClient] Failed to fetch Pathao info client-side:", e);
        }
        setLoadingPathao(false);
      }
      fetchPathaoInfo();
    }
  }, [order.status, order.pathaoConsignmentId, pathaoInfoState]);

  useEffect(() => {
    if (printType !== null) {
      const timer = setTimeout(() => {
        window.print();
        setPrintType(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [printType]);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as OrderStatus;
    const oldStatus = status;
    if (newStatus === "RETURNED") {
      router.push(`/admin/odr_returns?orderId=${order.id}`);
      return;
    }

    if (newStatus === "HOLD") {
      setPendingStatus(newStatus);
      setIsHoldModalOpen(true);
      return;
    }

    setStatus(newStatus);
    setStatusLoading(true);
    const result = await updateOrderStatus(order.id, newStatus);
    if (!result?.success) {
      alert(result?.error || "Failed to update order status. Please verify transition rules.");
      setStatus(oldStatus);
    } else {
      router.refresh();
    }
    setStatusLoading(false);
  };

  const handleHoldConfirm = async (reason: string) => {
    if (!pendingStatus) return;
    const oldStatus = status;
    setStatus(pendingStatus);
    setStatusLoading(true);
    const result = await updateOrderStatus(order.id, pendingStatus, reason);
    if (!result?.success) {
      alert(result?.error || "Failed to update order status.");
      setStatus(oldStatus);
    } else {
      router.refresh();
    }
    setStatusLoading(false);
    setIsHoldModalOpen(false);
    setPendingStatus(null);
  };

  const handleHoldClose = () => {
    setIsHoldModalOpen(false);
    setPendingStatus(null);
  };

  const handleRequestCancellationConfirm = async (reason: string) => {
    const staffName = staffSession?.username || "Staff";
    const result = await requestOrderCancellation(order.id, staffName, reason || undefined);
    if (result.success) {
      setCancelRequest({ orderId: order.id, staffName, reason: reason || null, createdAt: new Date() });
      setIsCancelModalOpen(false);
      alert("Cancellation request submitted successfully.");
    } else {
      alert(result.error || "Failed to submit cancellation request.");
    }
  };

  const [formData, setFormData] = useState({
    customerName: order.customerName,
    phone: order.phone,
    district: order.district,
    address: order.address,
    advancePaid: order.advancePaid || 0,
    discountAmount: order.discountAmount || 0,
    items: order.items || [],
    deliveryCharge: order.deliveryCharge || 0,
    tags: order.tags || [],
    createdById: order.createdById || "",
    pathaoCityId: order.pathaoCityId || null,
    pathaoZoneId: order.pathaoZoneId || null,
    pathaoAreaId: order.pathaoAreaId || null,
    specialInstruction: order.specialInstruction || "",
    isStorePickup: order.isStorePickup,
  });

  const [cities, setCities] = useState<{ value: string; label: string }[]>([]);
  const [zones, setZones] = useState<{ value: string; label: string }[]>([]);
  const [areas, setAreas] = useState<{ value: string; label: string }[]>([]);

  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Fetch Pathao Cities on mount
  useEffect(() => {
    async function fetchCities() {
      setLoadingCities(true);
      const res = await getPathaoCities();
      if (res.success && res.data) {
        setCities(res.data.map((c: any) => ({ value: c.city_id.toString(), label: c.city_name })));
      }
      setLoadingCities(false);
    }
    fetchCities();
  }, []);

  // Fetch Zones when city ID changes
  useEffect(() => {
    async function fetchZones() {
      const cityId = isEditing ? formData.pathaoCityId : order.pathaoCityId;
      if (!cityId) {
        setZones([]);
        return;
      }
      setLoadingZones(true);
      const res = await getPathaoZones(cityId);
      if (res.success && res.data) {
        setZones(res.data.map((z: any) => ({ value: z.zone_id.toString(), label: z.zone_name })));
      }
      setLoadingZones(false);
    }
    fetchZones();
  }, [formData.pathaoCityId, order.pathaoCityId, isEditing]);

  // Fetch Areas when zone ID changes
  useEffect(() => {
    async function fetchAreas() {
      const zoneId = isEditing ? formData.pathaoZoneId : order.pathaoZoneId;
      if (!zoneId) {
        setAreas([]);
        return;
      }
      setLoadingAreas(true);
      const res = await getPathaoAreas(zoneId);
      if (res.success && res.data) {
        setAreas(res.data.map((a: any) => ({ value: a.area_id.toString(), label: a.area_name })));
      }
      setLoadingAreas(false);
    }
    fetchAreas();
  }, [formData.pathaoZoneId, order.pathaoZoneId, isEditing]);

  const [newProductData, setNewProductData] = useState({
    productId: "",
    size: "",
    quantity: 1,
    requiresPrint: false,
    printName: "",
    printNumber: "",
    printCost: dtfSetting?.printCost || 300,
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAddress = () => {
    const cityLabel = cities.find((c) => c.value === order.pathaoCityId?.toString())?.label;
    const zoneLabel = zones.find((z) => z.value === order.pathaoZoneId?.toString())?.label;
    const areaLabel = areas.find((a) => a.value === order.pathaoAreaId?.toString())?.label;

    const parts = [
      `Name: ${order.customerName || ""}`,
      `Phone: ${order.phone || ""}`
    ];

    if (cityLabel) {
      parts.push(`City: ${cityLabel}`);
    }
    if (zoneLabel) {
      parts.push(`Zone: ${zoneLabel}`);
    }
    if (areaLabel) {
      parts.push(`Area: ${areaLabel}`);
    }

    parts.push(`Address: ${order.address || ""}`);

    const text = parts.join("\n");
    navigator.clipboard.writeText(text);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const handleSave = async () => {
    if (formData.pathaoCityId && !formData.pathaoZoneId) {
      alert("Please select a Pathao zone since a city is selected.");
      return;
    }

    setLoading(true);
    let finalTags = formData.tags;
    const pendingTag = tagInput.replace(/,/g, "").trim();
    if (pendingTag) {
      if (!finalTags.includes(pendingTag)) {
        finalTags = [...finalTags, pendingTag];
        setFormData(prev => ({ ...prev, tags: finalTags }));
      }
      setTagInput("");
    }

    const result = await updateOrderDetails(order.id, {
      customerName: formData.customerName,
      phone: formData.phone,
      district: formData.district,
      address: formData.address,
      advancePaid: formData.advancePaid,
      discountAmount: formData.discountAmount,
      deliveryCharge: formData.deliveryCharge,
      isStorePickup: formData.isStorePickup,
      pathaoCityId: formData.pathaoCityId,
      pathaoZoneId: formData.pathaoZoneId,
      pathaoAreaId: formData.pathaoAreaId,
      specialInstruction: formData.specialInstruction || null,
      tags: finalTags,
      createdById: formData.createdById || null,
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

  const handleSaveTags = async () => {
    setLoading(true);
    let finalTags = tagsFormData;
    const pendingTag = tagInput.replace(/,/g, "").trim();
    if (pendingTag) {
      if (!finalTags.includes(pendingTag)) {
        finalTags = [...finalTags, pendingTag];
        setTagsFormData(finalTags);
      }
      setTagInput("");
    }

    const result = await updateOrderDetails(order.id, {
      customerName: order.customerName,
      phone: order.phone,
      district: order.district,
      address: order.address,
      advancePaid: order.advancePaid || 0,
      discountAmount: order.discountAmount || 0,
      deliveryCharge: order.deliveryCharge || 0,
      isStorePickup: order.isStorePickup,
      tags: finalTags,
    });
    if (result.success) {
      setIsEditingTags(false);
      router.refresh();
    } else {
      alert(result.error || "Failed to update tags");
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
      tags: order.tags || [],
      createdById: order.createdById || "",
      pathaoCityId: order.pathaoCityId || null,
      pathaoZoneId: order.pathaoZoneId || null,
      pathaoAreaId: order.pathaoAreaId || null,
      specialInstruction: order.specialInstruction || "",
      isStorePickup: order.isStorePickup,
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
    const product = localProducts.find((p) => p.id === newProductData.productId);
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
    setNewProductData({ productId: "", size: "", quantity: 1, requiresPrint: false, printName: "", printNumber: "", printCost: dtfSetting?.printCost || 300 });
  };

  // Financial calculations
  const baseSubtotal = formData.items.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
  const totalDTFCost = formData.items.reduce((acc: number, item: any) => acc + (item.requiresPrint ? item.printCost * item.quantity : 0), 0);
  const discount = formData.discountAmount || 0;
  const deliveryCharge = formData.isStorePickup
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
    { statusKey: "PENDING", title: "Placed", icon: Package },
    { statusKey: "CONFIRMED", title: "Confirmed", icon: CheckCircle2 },
    { statusKey: "PRINTING", title: "Printing", icon: Printer },
    { statusKey: "PACKAGING", title: "Packaged", icon: PackageCheck },
    { statusKey: "SHIPPED", title: "Shipped", icon: Truck },
    { statusKey: "DELIVERED", title: "Delivered", icon: Check },
  ];
  const STATUS_ORDER = ["PENDING", "CONFIRMED", "PRINTING", "PACKAGING", "SHIPPED", "DELIVERED"];
  const isSpecial = order.status === "CANCELLED" || order.status === "RETURNED" || order.status === "HOLD";
  const hasPrint = order.items?.some((i: any) => i.requiresPrint);
  const filteredSteps = STATUS_STEPS.filter((s) => s.statusKey !== "PRINTING" || hasPrint || order.status === "PRINTING");

  const timelineIndex = filteredSteps.findIndex(s => s.statusKey === order.status);
  const safeCurrentIndex = timelineIndex !== -1 ? timelineIndex : 0;
  const halfStepWidth = 100 / (filteredSteps.length * 2);
  const activeWidth = (safeCurrentIndex / (filteredSteps.length - 1)) * (100 - 2 * halfStepWidth);

  const pathaoStatus = pathaoInfoState?.order_status || pathaoInfoState?.order_status_slug || null;
  const pathaoStatusLower = (pathaoStatus || "").toLowerCase();

  const DISTRICTS = ["Bagerhat", "Bandarban", "Barguna", "Barisal", "Bhola", "Bogra", "Brahmanbaria", "Chandpur", "Chapainawabganj", "Chattogram", "Chuadanga", "Comilla", "Cox's Bazar", "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet", "Tangail", "Thakurgaon", "Self Pickup"].sort();

  const statusColor: Record<string, string> = {
    DELIVERED: "bg-emerald-100 text-emerald-700 border-emerald-200",
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    CONFIRMED: "bg-blue-100 text-blue-700 border-blue-200",
    PACKAGING: "bg-purple-100 text-purple-700 border-purple-200",
    PRINTING: "bg-violet-100 text-violet-700 border-violet-200",
    SHIPPED: "bg-indigo-100 text-indigo-700 border-indigo-200",
    CANCELLED: "bg-red-100 text-red-700 border-red-200",
    RETURNED: "bg-slate-100 text-slate-600 border-slate-200",
    HOLD: "bg-pink-100 text-pink-700 border-pink-200",
  };

  const modifyStatus = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Order Placed";
      case "CONFIRMED":
        return "Order Confirmed";
      case "PRINTING":
        return "Order Printing";
      case "PACKAGING":
        return "Order Packaged";
      case "SHIPPED":
        return "Order Shipped";
      case "DELIVERED":
        return "Order Delivered";
      case "CANCELLED":
        return "Order Cancelled";
      case "RETURNED":
        return "Order Returned";
      case "HOLD":
        return "Order On Hold";
      default:
        return status;
    }
  };

  return (
    <>
      {printType === "A4" && <InvoicePrintView orders={[order]} />}
      {printType === "80MM" && <ThermalPrintView orders={[order]} posFooter={deliverySettings?.posFooter} />}

      <div className="no-print flex flex-col gap-5 max-w-7xl mx-auto pb-10 px-4 sm:px-6">
        {/* Sticky Page Header */}
        <div className="sticky top-0 z-40 bg-slate-50/95 backdrop-blur-sm -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <Link
              href={backUrl}
              className="mt-0.5 p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  Order ID: <span className="font-mono select-all text-slate-800">{order.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyOrderId}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-[#800020] transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer"
                    title="Copy Order ID"
                  >
                    {idCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3px]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </h1>
                <span className={`text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider ${statusColor[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                  {modifyStatus(order.status)}
                </span>
                {order.isStorePickup && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border-teal-200">
                    Store Pickup
                  </span>
                )}
                {order.orderSource === "eCommerce" && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border-sky-200">
                    eCommerce
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Created {new Date(order.createdAt).toLocaleString("en-GB", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit"
                })}
              </p>
            </div>
          </div>

          {/* Right side of Header */}
          <div className="flex items-center gap-4 shrink-0">
            {!isEditing && commissionInfo && (
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Commission ({commissionInfo.rate}%)</p>
                <p className={`text-base font-extrabold tracking-tight ${commissionInfo.orderStatus === "DELIVERED" ? "text-emerald-600" : commissionInfo.orderStatus === "CANCELLED" ? "text-slate-400" : "text-amber-600"}`}>
                  {commissionInfo.orderStatus === "CANCELLED" ? "—" : `৳${commissionInfo.amount.toLocaleString()}`}
                </p>
                {commissionInfo.orderStatus !== "DELIVERED" && commissionInfo.orderStatus !== "CANCELLED" && (
                  <p className="text-[9px] text-amber-500 font-bold tracking-wide">Earns when Delivered</p>
                )}
              </div>
            )}

            {!isEditing && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintType("A4")}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-lg hover:border-[#800020]/30 hover:text-[#800020] transition duration-200 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#800020] transition-colors" />
                  Print
                </button>
                <button
                  onClick={() => setPrintType("80MM")}
                  className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/80 px-3.5 py-1.5 rounded-lg hover:border-[#800020]/30 hover:text-[#800020] transition duration-200 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#800020] transition-colors" />
                  POS Print
                </button>
                <button
                  onClick={() => setPrintType("A4")}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#800020] bg-[#800020]/5 border border-[#800020]/15 px-3.5 py-1.5 rounded-lg hover:bg-[#800020]/10 hover:border-[#800020]/25 transition duration-200 shadow-sm cursor-pointer"
                  title="Download A4 PDF"
                >
                  <Download className="w-3.5 h-3.5 text-[#800020]" />
                  Download PDF
                </button>
              </div>
            )}

            {isEditing && (
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
            )}
          </div>
        </div>

        {/* Main 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Left Main Column ── */}
          <div className="lg:col-span-2 space-y-4">



            {/* Live Shipment Milestone Card */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#800020]" />
                  Shipment Status
                </h2>
                <div className="flex items-center gap-3">
                  {order.status === "SHIPPED" && order.pathaoConsignmentId && (
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                      </span>
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Live</span>
                    </div>
                  )}
                  {order.pathaoConsignmentId && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5">
                      <span className="text-[10px] font-bold">Pathao ID:</span>
                      <span className="text-xs font-mono font-semibold text-indigo-600 select-all">{order.pathaoConsignmentId}</span>
                      <button
                        onClick={() => handleCopy(order.pathaoConsignmentId)}
                        className="p-1 hover:bg-indigo-100 text-indigo-500 rounded transition-colors"
                        title="Copy"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-5 py-5">
                {isSpecial ? (
                  <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-bold ${order.status === "CANCELLED"
                    ? "bg-red-50 text-red-700 border border-red-100"
                    : order.status === "HOLD"
                      ? "bg-pink-50 text-pink-700 border border-pink-100"
                      : "bg-slate-50 text-slate-700 border border-slate-200"
                    }`}>
                    <AlertCircle className={`w-4 h-4 shrink-0 ${order.status === "HOLD" ? "text-pink-500" : "text-slate-500"}`} />
                    Order {order.status === "HOLD" ? "On Hold" : order.status}
                  </div>
                ) : (
                  <div className="relative flex items-start">
                    {/* Horizontal progress bar background */}
                    <div
                      className="absolute top-4 h-[2px] bg-slate-200"
                      style={{
                        zIndex: 0,
                        left: `${halfStepWidth}%`,
                        right: `${halfStepWidth}%`
                      }}
                    />

                    {/* Horizontal progress bar active fill */}
                    <div
                      className="absolute top-4 h-[2px] bg-emerald-500 transition-all duration-500 ease-in-out"
                      style={{
                        zIndex: 0,
                        left: `${halfStepWidth}%`,
                        width: `${activeWidth}%`
                      }}
                    />
                    <div className="flex w-full relative">
                      {filteredSteps.map((step, idx) => {
                        const isCompleted = idx < safeCurrentIndex;
                        const isActive = idx === safeCurrentIndex;
                        const showPathao = step.statusKey === "SHIPPED" && order.pathaoConsignmentId;
                        const Icon = step.icon;
                        return (
                          <div key={step.statusKey} className="flex flex-col items-center flex-1 min-w-0">
                            <div className={`relative z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${isActive ? "bg-[#800020] border-[#800020] text-white ring-4 ring-[#800020]/15 shadow-md scale-110" : isCompleted ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" : "bg-white border-slate-200 text-slate-400"}`}>
                              {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3px]" /> : <Icon className="w-3.5 h-3.5 stroke-[2.5px]" />}
                            </div>
                            <span className={`mt-2 text-[10px] font-bold text-center leading-tight px-0.5 uppercase tracking-wide transition-colors ${isActive ? "text-[#800020] font-extrabold" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
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
                                {pathaoInfoState?.updated_at && (
                                  <span className="text-[8px] text-slate-400 text-center leading-tight">
                                    {new Date(pathaoInfoState.updated_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
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

            {/* Products Card */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-150 rounded-t-xl bg-slate-50/50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-500" />
                  Products
                  <span className="text-[11px] font-semibold bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-full ml-1">
                    {formData.items.length}
                  </span>
                </h2>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-[#800020] transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Edit
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {formData.items.map((item: any, index: number) => {
                  const returnedQty = (order.salesReturns || [])
                    .filter((r: any) => r.orderItemId === item.id)
                    .reduce((sum: number, r: any) => sum + r.quantity, 0);
                  const fullyReturned = returnedQty >= item.quantity;

                  return (
                    <div key={item.id} className={`flex items-start gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors ${fullyReturned ? "opacity-60" : ""}`}>
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
                        <p className="text-sm font-bold text-slate-800 truncate">{item.product?.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-extrabold bg-slate-800 text-white px-2 py-0.5 rounded tracking-widest uppercase">{item.variant?.size || item.size}</span>
                          <span className="text-xs font-semibold text-slate-500">@ {formatBDT(item.price)}</span>
                          {item.requiresPrint && (
                            <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                              🖨️ Print: {item.printName} (#{item.printNumber})
                            </span>
                          )}
                          {returnedQty > 0 && (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${fullyReturned
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : "bg-rose-50 text-rose-600 border border-rose-150"
                              }`}>
                              {fullyReturned ? "Fully Returned" : `Returned: ${returnedQty}`}
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
                  );
                })}
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
                        <CustomSelect
                          options={loadingProducts ? [] : localProducts.map((p) => ({ value: p.id, label: p.name }))}
                          value={newProductData.productId}
                          onChange={(val) => setNewProductData({ ...newProductData, productId: val, size: "" })}
                          placeholder={loadingProducts ? "Loading products..." : "Select Product"}
                          searchable
                        />
                      </div>
                      {newProductData.productId && (
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">Size</label>
                          <CustomSelect
                            options={(localProducts.find((p) => p.id === newProductData.productId)?.variants || []).map((v: any) => ({ value: v.size, label: `${v.size} (Stock: ${v.stock})` }))}
                            value={newProductData.size}
                            onChange={(val) => setNewProductData({ ...newProductData, size: val })}
                            openUpwards
                          />
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
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-150 bg-slate-50/50">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  Order Summary
                </h2>
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
                  <span className="text-slate-500">Shipping {!formData.isStorePickup && formData.district && <span className="text-[10px] text-slate-400 ml-1">({formData.district})</span>}</span>
                  {isEditing && formData.isStorePickup ? (
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
                <div className={`mt-4 flex items-center justify-between transition-all duration-300 ${totalDue > 0 ? "text-rose-800" : "text-emerald-800"}`}>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block opacity-75">Payment Due</span>
                    <span className="text-[10px] opacity-60 block mt-0.5">Collectable from Customer</span>
                  </div>
                  <span className={`text-2xl font-black tracking-tight tabular-nums ${totalDue > 0 ? "text-rose-600" : "text-emerald-600"}`}>
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


          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-4">

            {/* Order Status Action Card */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-slate-500" />
                  Order Status
                </h3>
                {statusLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>
              <div className="p-4 space-y-3">
                {backUrl?.includes("/staff") ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                      <span className="text-xs font-bold text-slate-500">Current Status</span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          status === "CONFIRMED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            status === "PRINTING" ? "bg-cyan-50 text-cyan-700 border-cyan-200" :
                              status === "PACKAGING" ? "bg-purple-50 text-purple-700 border-purple-200" :
                                status === "SHIPPED" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                                  status === "DELIVERED" ? "bg-green-50 text-green-700 border-green-200" :
                                    status === "RETURNED" ? "bg-rose-50 text-rose-700 border-rose-200" :
                                      status === "HOLD" ? "bg-pink-50 text-pink-700 border-pink-200" :
                                        "bg-red-50 text-red-700 border-red-200"
                          }`}
                      >
                        {status === "PENDING" ? "Placed" :
                          status === "CONFIRMED" ? "Confirmed" :
                            status === "PRINTING" ? "Printing" :
                              status === "PACKAGING" ? "Packaged" :
                                status === "SHIPPED" ? "Shipped" :
                                  status === "DELIVERED" ? "Delivered" :
                                    status === "HOLD" ? "On Hold" :
                                      status === "RETURNED" ? "Returned" :
                                        "Cancelled"}
                      </span>
                    </div>

                    {/* Cancellation Request Section for Staff */}
                    {status !== "CANCELLED" && status !== "RETURNED" && (
                      cancelRequest ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] text-rose-700 font-semibold justify-center shadow-sm">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>Cancellation Requested</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsCancelModalOpen(true)}
                          className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition duration-200 cursor-pointer shadow-sm"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Request Cancellation
                        </button>
                      )
                    )}
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <select
                        value={status}
                        onChange={handleStatusChange}
                        disabled={statusLoading || status === "CANCELLED" || status === "RETURNED"}
                        className={`w-full text-xs font-black uppercase tracking-wider px-3.5 py-2.5 rounded-lg border transition-all cursor-pointer outline-none focus:ring-2 focus:ring-opacity-50 ${status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200 focus:ring-amber-500" :
                          status === "CONFIRMED" ? "bg-blue-50 text-blue-700 border-blue-200 focus:ring-blue-500" :
                            status === "PRINTING" ? "bg-cyan-50 text-cyan-700 border-cyan-200 focus:ring-cyan-500" :
                              status === "PACKAGING" ? "bg-purple-50 text-purple-700 border-purple-200 focus:ring-purple-500" :
                                status === "SHIPPED" ? "bg-indigo-50 text-indigo-700 border-indigo-200 focus:ring-indigo-500" :
                                  status === "DELIVERED" ? "bg-green-50 text-green-700 border-green-200 focus:ring-green-500" :
                                    status === "RETURNED" ? "bg-rose-50 text-rose-700 border-rose-200 focus:ring-rose-500" :
                                      status === "HOLD" ? "bg-pink-50 text-pink-700 border-pink-200 focus:ring-pink-500" :
                                        "bg-red-50 text-red-700 border-red-200 focus:ring-red-500"
                          }`}
                      >
                        <option value="PENDING" disabled={!validateStatusTransition(status, "PENDING").isValid}>Placed</option>
                        <option value="CONFIRMED" disabled={!validateStatusTransition(status, "CONFIRMED").isValid}>Confirmed</option>
                        <option value="PRINTING" disabled={!validateStatusTransition(status, "PRINTING").isValid}>Printing</option>
                        <option value="PACKAGING" disabled={!validateStatusTransition(status, "PACKAGING").isValid}>Packaged</option>
                        <option value="SHIPPED" disabled={!validateStatusTransition(status, "SHIPPED").isValid}>Shipped</option>
                        <option value="DELIVERED" disabled={!validateStatusTransition(status, "DELIVERED").isValid}>Delivered</option>
                        <option value="HOLD" disabled={!validateStatusTransition(status, "HOLD").isValid}>On Hold</option>
                        <option value="RETURNED" disabled={!validateStatusTransition(status, "RETURNED").isValid}>Returned</option>
                        <option value="CANCELLED" disabled={!validateStatusTransition(status, "CANCELLED").isValid}>Cancelled</option>
                      </select>
                    </div>

                    {status === "CANCELLED" || status === "RETURNED" ? (
                      <p className="text-[10px] text-slate-400 font-medium">
                        Orders in {status} status cannot be further transitioned.
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 font-medium">
                        Select a status to update.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Shipping Address Card */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-150 rounded-t-xl bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  Shipping Address
                </h3>
                {!isEditing && (
                  <div className="flex items-center gap-3">
                    <button onClick={handleCopyAddress} className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer">
                      {copiedAddress ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3px]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-indigo-600 hover:text-[#800020] transition-colors flex items-center gap-1 cursor-pointer">
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 space-y-3">
                {isEditing ? (
                  <>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-slate-700">Store Pickup</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isStorePickup}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData({
                              ...formData,
                              isStorePickup: checked,
                              district: checked ? "Self Pickup" : (formData.district === "Self Pickup" ? "Dhaka" : formData.district),
                              deliveryCharge: checked ? 0 : formData.deliveryCharge,
                              // Clear Pathao values if it's store pickup
                              pathaoCityId: checked ? null : formData.pathaoCityId,
                              pathaoZoneId: checked ? null : formData.pathaoZoneId,
                              pathaoAreaId: checked ? null : formData.pathaoAreaId,
                            });
                          }}
                          className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 cursor-pointer"
                        />
                      </label>
                    </div>

                    {!formData.isStorePickup && (
                      <>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select City</label>
                          <CustomSelect
                            options={[
                              { value: "", label: "-- None / Direct Address --" },
                              ...cities
                            ]}
                            value={formData.pathaoCityId?.toString() || ""}
                            onChange={(val) => {
                              const valNum = val ? parseInt(val) : null;
                              const city = cities.find((c) => c.value === val);
                              setFormData({
                                ...formData,
                                pathaoCityId: valNum,
                                pathaoZoneId: null,
                                pathaoAreaId: null,
                                district: city ? city.label : formData.district,
                              });
                            }}
                            placeholder={loadingCities ? "Loading cities..." : "Select City"}
                            searchable
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Pathao Zone {formData.pathaoCityId ? <span className="text-red-500">*</span> : ""}
                          </label>
                          <CustomSelect
                            options={[
                              { value: "", label: "-- Select Zone --" },
                              ...zones
                            ]}
                            value={formData.pathaoZoneId?.toString() || ""}
                            onChange={(val) => {
                              const valNum = val ? parseInt(val) : null;
                              setFormData({
                                ...formData,
                                pathaoZoneId: valNum,
                                pathaoAreaId: null,
                              });
                            }}
                            disabled={!formData.pathaoCityId || loadingZones}
                            placeholder={loadingZones ? "Loading zones..." : (!formData.pathaoCityId ? "First select Pathao City" : "Select Zone")}
                            searchable
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pathao Area</label>
                          <CustomSelect
                            options={[
                              { value: "", label: "-- Select Area --" },
                              ...areas
                            ]}
                            value={formData.pathaoAreaId?.toString() || ""}
                            onChange={(val) => {
                              const valNum = val ? parseInt(val) : null;
                              setFormData({
                                ...formData,
                                pathaoAreaId: valNum,
                              });
                            }}
                            disabled={!formData.pathaoZoneId || loadingAreas}
                            placeholder={loadingAreas ? "Loading areas..." : (!formData.pathaoZoneId ? "First select Pathao Zone" : "Select Area")}
                            searchable
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address</label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        rows={3}
                        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700 resize-none"
                      />
                    </div>

                    {!formData.isStorePickup && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pathao Special Instruction</label>
                        <textarea
                          value={formData.specialInstruction}
                          onChange={(e) => setFormData({ ...formData, specialInstruction: e.target.value })}
                          rows={2}
                          placeholder="Add special instructions for Pathao delivery rider..."
                          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 text-slate-700 resize-none"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-3.5">
                    {/* Name and Phone */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900 leading-tight">{order.customerName}</span>
                        {order.isStorePickup && (
                          <span className="text-[9px] font-extrabold bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded uppercase tracking-wider">🏪 Store Pickup</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1.5">
                        <span className="text-slate-400"></span> {order.phone}
                      </p>
                    </div>

                    {/* Pathao / Shipping info */}
                    {(order.pathaoCityId || order.pathaoZoneId) && (
                      <div className="grid grid-cols-[45px_1fr] gap-x-2.5 gap-y-1.5 text-xs py-2 border-t border-b border-slate-100">
                        {cities.find((c) => c.value === order.pathaoCityId?.toString())?.label && (
                          <>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none self-center">City:</span>
                            <span className="text-slate-700 font-semibold">{cities.find((c) => c.value === order.pathaoCityId?.toString())?.label}</span>
                          </>
                        )}
                        {zones.find((z) => z.value === order.pathaoZoneId?.toString())?.label && (
                          <>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none self-center">Zone:</span>
                            <span className="text-slate-700 font-semibold">{zones.find((z) => z.value === order.pathaoZoneId?.toString())?.label}</span>
                          </>
                        )}
                        {areas.find((a) => a.value === order.pathaoAreaId?.toString())?.label && (
                          <>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider select-none self-center">Area:</span>
                            <span className="text-slate-700 font-semibold">{areas.find((a) => a.value === order.pathaoAreaId?.toString())?.label}</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Delivery Address */}
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1 select-none">Delivery Address</span>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium bg-slate-50/50 p-2.5 rounded-lg border border-slate-100/70">{order.address}</p>
                    </div>

                    {/* Pathao Special Instruction */}
                    {order.specialInstruction && (
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1 select-none">Pathao Special Instruction</span>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium bg-amber-50/55 p-2.5 rounded-lg border border-amber-100/60">{order.specialInstruction}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notes / Remarks Card */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-slate-500" />
                  Notes
                </h3>
                {!isEditingRemark ? (
                  <button onClick={() => setIsEditingRemark(true)} className="text-xs font-bold text-indigo-600 hover:text-[#800020] transition-colors flex items-center gap-1">
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

            {/* Tags Card */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-500" />
                  Tags
                </h3>
                {!isEditing && !isEditingTags && (
                  <button
                    onClick={() => {
                      setIsEditingTags(true);
                      setTagsFormData(order.tags || []);
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-[#800020] transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                )}
                {isEditingTags && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveTags}
                      disabled={loading}
                      className="text-xs font-bold text-white bg-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1 transition-colors"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingTags(false);
                      }}
                      disabled={loading}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4">
                {(isEditing || isEditingTags) ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all min-h-[42px]">
                      {(isEditing ? formData.tags : tagsFormData).map((tag: string, idx: number) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setFormData({
                                  ...formData,
                                  tags: formData.tags.filter((_, i) => i !== idx),
                                });
                              } else {
                                setTagsFormData(tagsFormData.filter((_, i) => i !== idx));
                              }
                            }}
                            className="text-indigo-400 hover:text-indigo-600 focus:outline-none transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
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
                            const val = tagInput.replace(/,/g, "").trim();
                            if (val) {
                              if (isEditing) {
                                if (!formData.tags.includes(val)) {
                                  setFormData({
                                    ...formData,
                                    tags: [...formData.tags, val],
                                  });
                                }
                              } else {
                                if (!tagsFormData.includes(val)) {
                                  setTagsFormData([...tagsFormData, val]);
                                }
                              }
                            }
                            setTagInput("");
                          }
                        }}
                        placeholder={(isEditing ? formData.tags : tagsFormData).length === 0 ? "Type tag name and press Enter..." : "Add tag..."}
                        className="flex-1 bg-transparent border-none p-0 text-sm focus:ring-0 outline-none placeholder:text-slate-400 min-w-[100px]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {order.tags && order.tags.length > 0 ? (
                      order.tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200/60"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No tags associated with this order.</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Info Card */}
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="px-4 py-3.5 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  Customer Info
                </h3>
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-indigo-600 hover:text-[#800020] transition-colors flex items-center gap-1">
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
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Salesman (Incentive Owner)</label>
                      <CustomSelect
                        options={[
                          { value: "", label: "System / eCommerce (None)" },
                          ...staff.map((s: StaffMember) => ({
                            value: s.id,
                            label: `${s.username} (${s.role?.name || "Staff"})`
                          }))
                        ]}
                        value={formData.createdById || ""}
                        onChange={(val) => setFormData({ ...formData, createdById: val })}
                        searchable={true}
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


            {/* Order Source / Exchange Tag Card (if applicable) */}
            {(order.isExchange || order.exchangeRefOrderId) && (
              <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="px-4 py-3.5 border-b border-slate-150 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                    Exchange Order
                  </h3>
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
        {/* Activity Log Section */}
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden mt-4">
          <div className="px-5 py-4 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500 animate-pulse" />
              Order Activity History
              <span className="text-[11px] font-semibold bg-slate-200/60 text-slate-600 px-2 py-0.5 rounded-full ml-1">
                {activityLogs.length}
              </span>
            </h2>
          </div>
          <div className="p-6">
            {activityLogs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No activity logs recorded for this order.</p>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
                {activityLogs.map((log: any) => {
                  const isCreate = log.action === "CREATE";
                  const isUpdate = log.action === "UPDATE";
                  const isDelete = log.action === "DELETE";

                  return (
                    <div key={log.id} className="relative group/log">
                      {/* Timeline Dot Indicator */}
                      <span className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${isCreate ? "border-emerald-500 text-emerald-500" :
                        isUpdate ? "border-indigo-500 text-indigo-500" :
                          "border-rose-500 text-rose-500"
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isCreate ? "bg-emerald-500" :
                          isUpdate ? "bg-indigo-500" :
                            "bg-rose-500"
                          }`} />
                      </span>

                      {/* Content */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${isCreate ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                              isUpdate ? "bg-indigo-50 border-indigo-100 text-indigo-700" :
                                "bg-rose-50 border-rose-100 text-rose-700"
                              }`}>
                              {log.action}
                            </span>
                            <span className="text-xs font-bold text-slate-700">{log.description}</span>
                            {log.changedFields && log.changedFields.length > 0 && (
                              <span className="text-[9px] font-semibold text-slate-400">
                                (fields: {log.changedFields.join(", ")})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                            <span className="font-semibold text-slate-500">{log.userEmail || "System/eCommerce"}</span>
                            <span className="uppercase text-[9px] px-1 bg-slate-100 rounded text-slate-500 font-bold">{log.userRole || "System"}</span>
                            <span>•</span>
                            <span>{new Date(log.timestamp).toLocaleString("en-GB", {
                              day: "numeric", month: "short", year: "numeric",
                              hour: "2-digit", minute: "2-digit"
                            })}</span>
                          </div>
                        </div>

                        {/* View Changes Action button */}
                        {isUpdate && log.dataBefore && log.dataAfter && (
                          <button
                            type="button"
                            onClick={() => toggleLogExpanded(log.id)}
                            className="self-start sm:self-center p-1.5 hover:bg-slate-100 text-indigo-600 hover:text-[#800020] rounded-lg transition-colors focus:outline-none cursor-pointer"
                            title={expandedLogs[log.id] ? "Hide Changes" : "View Changes"}
                          >
                            {expandedLogs[log.id] ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Expanded Diff Block */}
                      {isUpdate && expandedLogs[log.id] && (
                        <div className="mt-3 p-4 bg-slate-50/50 border border-slate-150 rounded-xl text-xs space-y-2 animate-in slide-in-from-top-2 duration-200 max-w-3xl">
                          <div className="font-bold text-slate-400 uppercase tracking-wider text-[9px] mb-1">State Modifications</div>
                          {getDiffDetails(log)?.map((d: any) => (
                            <div key={d.field} className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-slate-100 last:border-0 items-start">
                              <span className="font-mono font-bold text-slate-600 block py-0.5">{d.field}</span>
                              <div className="flex flex-col gap-2 min-w-0 w-full">
                                <div className="px-2.5 py-1.5 rounded bg-rose-50 text-rose-600 border border-rose-100 line-through text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words">
                                  {formatValue(d.oldVal, d.field)}
                                </div>
                                <div className="text-slate-400 font-bold text-[10px] pl-2 flex items-center gap-1">
                                  <span>↓</span> Changed To
                                </div>
                                <div className="px-2.5 py-1.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words">
                                  {formatValue(d.newVal, d.field)}
                                </div>
                              </div>
                            </div>
                          )) || <span className="text-slate-400 italic">No field differences detected.</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <HoldReasonModal
          isOpen={isHoldModalOpen}
          onClose={handleHoldClose}
          onConfirm={handleHoldConfirm}
        />

        <CancelReasonModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          onConfirm={handleRequestCancellationConfirm}
        />
      </div>
    </>
  );
}
