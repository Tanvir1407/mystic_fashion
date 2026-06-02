"use client";

import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import { CustomSelect } from "@/components/CustomSelect";
import { FooterData } from "@/lib/footer";
import {
  User,
  Package,
  MapPin,
  LogOut,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  Clock,
  Truck,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Download,
  MapPinned,
  Calendar,
  CreditCard,
  X,
  Loader2
} from "lucide-react";
import { logoutCustomerAction } from "../actions/customerAuth";
import { saveCustomerAddressAction, deleteCustomerAddressAction } from "../actions/addressActions";
import { getPathaoCities, getPathaoZones, getPathaoAreas, trackCustomerOrder } from "../actions/pathao";
import { formatBDT } from "@/utils/formatPrice";

interface Address {
  id?: string;
  label: string;
  fullName: string;
  phone: string;
  district: string;
  address: string;
  pathaoCityId?: number | null;
  pathaoZoneId?: number | null;
  pathaoAreaId?: number | null;
  isDefault: boolean;
}

interface OrderItem {
  id: string;
  size: string | null;
  quantity: number;
  price: number;
  requiresPrint: boolean;
  printName: string | null;
  printNumber: string | null;
  product: {
    name: string;
    image: string | null;
  };
}

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  advancePaid: number;
  deliveryCharge: number;
  discountAmount: number;
  couponCode: string | null;
  remarks: string | null;
  address: string;
  customerName: string;
  phone: string;
  pathaoConsignmentId: string | null;
  createdAt: string;
  items: OrderItem[];
}

export default function AccountClient({
  customer,
  initialAddresses,
  orders,
  footerData
}: {
  customer: { id: string; name: string; phone: string; email?: string | null; createdAt: string };
  initialAddresses: Address[];
  orders: Order[];
  footerData: FooterData | null;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"orders" | "addresses" | "profile">("orders");
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [isPending, startTransition] = useTransition();

  // Address Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressLabel, setAddressLabel] = useState("Home");
  const [addressName, setAddressName] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [addressDetails, setAddressDetails] = useState("");
  const [isDefaultAddress, setIsDefaultAddress] = useState(false);

  // Pathao select states inside Address Form
  const [cities, setCities] = useState<{ value: string, label: string }[]>([]);
  const [zones, setZones] = useState<{ value: string, label: string }[]>([]);
  const [areas, setAreas] = useState<{ value: string, label: string }[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [modalError, setModalError] = useState("");

  // Tracking Order State
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [liveTrackingInfo, setLiveTrackingInfo] = useState<any>(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Fetch Pathao cities on modal mount
  useEffect(() => {
    if (isAddressModalOpen) {
      async function loadCities() {
        setLoadingLocations(true);
        const res = await getPathaoCities();
        if (res.success && res.data) {
          setCities(res.data.map((c: any) => ({ value: c.city_id.toString(), label: c.city_name })));
        }
        setLoadingLocations(false);
      }
      loadCities();
    }
  }, [isAddressModalOpen]);

  // Fetch Zones when City changes inside Address Form
  useEffect(() => {
    if (selectedCityId) {
      async function loadZones() {
        setLoadingLocations(true);
        const res = await getPathaoZones(selectedCityId!);
        if (res.success && res.data) {
          setZones(res.data.map((z: any) => ({ value: z.zone_id.toString(), label: z.zone_name })));
        }
        setLoadingLocations(false);
      }
      loadZones();
      setZones([]);
      setAreas([]);
      setSelectedZoneId(null);
      setSelectedAreaId(null);
    }
  }, [selectedCityId]);

  // Fetch Areas when Zone changes inside Address Form
  useEffect(() => {
    if (selectedZoneId) {
      async function loadAreas() {
        setLoadingLocations(true);
        const res = await getPathaoAreas(selectedZoneId!);
        if (res.success && res.data) {
          setAreas(res.data.map((a: any) => ({ value: a.area_id.toString(), label: a.area_name })));
        }
        setLoadingLocations(false);
      }
      loadAreas();
      setAreas([]);
      setSelectedAreaId(null);
    }
  }, [selectedZoneId]);

  // Logout Handler
  const handleLogout = async () => {
    const res = await logoutCustomerAction();
    if (res.success) {
      router.push("/");
      router.refresh();
    }
  };

  // Open Add Address Modal
  const openAddModal = () => {
    if (addresses.length >= 2) {
      alert("You have reached the maximum address limit (2 addresses max). Please edit or delete an existing address.");
      return;
    }
    setEditingAddress(null);
    setAddressLabel("Home");
    setAddressName(customer.name);
    setAddressPhone(customer.phone);
    setAddressDetails("");
    setIsDefaultAddress(addresses.length === 0);
    setSelectedCityId(null);
    setSelectedZoneId(null);
    setSelectedAreaId(null);
    setModalError("");
    setIsAddressModalOpen(true);
  };

  // Open Edit Address Modal
  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    setAddressLabel(addr.label);
    setAddressName(addr.fullName);
    setAddressPhone(addr.phone);
    setAddressDetails(addr.address);
    setIsDefaultAddress(addr.isDefault);
    setSelectedCityId(addr.pathaoCityId || null);
    setSelectedZoneId(addr.pathaoZoneId || null);
    setSelectedAreaId(addr.pathaoAreaId || null);
    setModalError("");
    setIsAddressModalOpen(true);
  };

  // Handle Address Submit
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    if (!addressName.trim() || !addressPhone.trim() || !addressDetails.trim() || !selectedCityId || !selectedZoneId || !selectedAreaId) {
      setModalError("Please fill out all the fields and select your delivery location.");
      return;
    }

    const cityName = cities.find(c => c.value === selectedCityId.toString())?.label || "";

    const payload = {
      id: editingAddress?.id,
      label: addressLabel,
      fullName: addressName.trim(),
      phone: addressPhone.trim(),
      district: cityName,
      address: addressDetails.trim(),
      pathaoCityId: selectedCityId,
      pathaoZoneId: selectedZoneId,
      pathaoAreaId: selectedAreaId,
      isDefault: isDefaultAddress
    };

    startTransition(async () => {
      const res = await saveCustomerAddressAction(payload);
      if (res.success) {
        setIsAddressModalOpen(false);
        router.refresh();
        // Dynamically update address state to avoid reload lag
        window.location.reload();
      } else {
        setModalError(res.error || "Failed to save address.");
      }
    });
  };

  // Handle Address Delete
  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    const res = await deleteCustomerAddressAction(id);
    if (res.success) {
      setAddresses(prev => prev.filter(a => a.id !== id));
      router.refresh();
      // Reload page is required to sync default changes
      window.location.reload();
    } else {
      alert(res.error || "Failed to delete address.");
    }
  };

  // Toggle order expanded view & fetch Pathao Tracking info
  const handleOrderExpand = async (orderId: string, pathaoId: string | null) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      setLiveTrackingInfo(null);
      return;
    }

    setExpandedOrderId(orderId);
    setLiveTrackingInfo(null);

    if (pathaoId) {
      setLoadingTracking(true);
      const res = await trackCustomerOrder(orderId);
      if (res.success && res.data?.pathaoInfo) {
        setLiveTrackingInfo(res.data.pathaoInfo);
      }
      setLoadingTracking(false);
    }
  };

  // Format Date utility
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  // Map order status to visual indicators
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "PROCESSING":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "SHIPPED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "COMPLETED":
      case "DELIVERED":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
            <div className="w-16 h-16 rounded-full bg-[#800020] text-white flex items-center justify-center font-black text-2xl shadow-md">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">Welcome, {customer.name}</h1>
              <p className="text-xs text-slate-500 mt-1"> &bull; Member since {formatDate(customer.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2 border border-slate-200"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Dashboard Core Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar Menu */}
          <aside className="w-full lg:w-1/4">
            <nav className="flex flex-row lg:flex-col bg-white border border-slate-200 p-1 lg:p-2 divide-x lg:divide-x-0 lg:divide-y divide-slate-100 sticky top-28">
              <button
                onClick={() => setActiveTab("orders")}
                className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-3 px-4 py-3.5 text-xs font-black uppercase tracking-wider transition-all ${activeTab === "orders"
                    ? "text-[#800020] bg-rose-50/50 border-b-2 lg:border-b-0 lg:border-l-4 lg:border-primary"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">My Orders</span>
              </button>

              <button
                onClick={() => setActiveTab("addresses")}
                className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-3 px-4 py-3.5 text-xs font-black uppercase tracking-wider transition-all ${activeTab === "addresses"
                    ? "text-[#800020] bg-rose-50/50 border-b-2 lg:border-b-0 lg:border-l-4 lg:border-primary"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Address Book</span>
              </button>

              <button
                onClick={() => setActiveTab("profile")}
                className={`flex-1 lg:flex-none flex items-center justify-center lg:justify-start gap-3 px-4 py-3.5 text-xs font-black uppercase tracking-wider transition-all ${activeTab === "profile"
                    ? "text-[#800020] bg-rose-50/50 border-b-2 lg:border-b-0 lg:border-l-4 lg:border-primary"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile Settings</span>
              </button>
            </nav>
          </aside>

          {/* Right Main Content */}
          <div className="flex-1">
            {/* ──────── TAB: ORDERS ──────── */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <h2 className="text-lg font-black uppercase tracking-wide">Order History</h2>
                  <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 font-bold">{orders.length} orders total</span>
                </div>

                {orders.length === 0 ? (
                  <div className="bg-white border border-slate-200 p-12 text-center">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="font-bold text-slate-800 text-base">No orders placed yet</p>
                    <p className="text-xs text-slate-500 mt-1 mb-6">Explore our latest jerseys and apparel collections.</p>
                    <Link href="/products" className="bg-[#800020] text-white px-6 py-3 text-xs font-black tracking-widest uppercase hover:bg-[#600018] transition-colors">
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                        {/* Order Header Summary */}
                        <div
                          onClick={() => handleOrderExpand(order.id, order.pathaoConsignmentId)}
                          className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="font-black text-sm text-slate-900">{order.id}</span>
                              <span className={`text-[10px] font-black uppercase border px-2 py-0.5 ${getStatusColor(order.status)}`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {formatDate(order.createdAt)}</span>
                              <span>&bull;</span>
                              <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-6">
                            <div className="text-right">
                              <p className="text-[10px] uppercase font-bold text-slate-400">Total BDT</p>
                              <p className="font-black text-[#800020] text-base">{formatBDT(order.totalAmount)}</p>
                            </div>
                            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${expandedOrderId === order.id ? "rotate-180" : ""}`} />
                          </div>
                        </div>

                        {/* Order Expansion Detail */}
                        {expandedOrderId === order.id && (
                          <div className="border-t border-slate-100 bg-slate-50/30 p-5 space-y-6 animate-slideDown">
                            {/* Product List */}
                            <div className="space-y-3.5">
                              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Items Ordered</p>
                              <div className="bg-white border border-slate-100 divide-y divide-slate-100">
                                {order.items.map((item) => (
                                  <div key={item.id} className="p-4 flex gap-4 items-center">
                                    <div className="relative w-12 h-16 bg-slate-50 overflow-hidden border border-slate-100 flex-shrink-0">
                                      {item.product.image && (
                                        <Image src={item.product.image} alt={item.product.name} fill className="object-cover" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-bold text-xs uppercase tracking-tight text-slate-800 truncate">{item.product.name}</h4>
                                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-medium">
                                        {item.size && <span className="bg-slate-100 px-1.5 py-0.5 rounded-sm">Size: {item.size}</span>}
                                        <span>Qty: {item.quantity}</span>
                                        <span>Price: {formatBDT(item.price)}</span>
                                      </div>

                                      {item.requiresPrint && (
                                        <div className="mt-2 text-[10px] bg-amber-50/80 border border-amber-100 text-amber-800 px-2.5 py-1 inline-flex items-center gap-1.5 font-semibold">
                                          <span>DTF Customized:</span>
                                          <span className="font-black">"{item.printName}"</span>
                                          <span>&bull;</span>
                                          <span className="font-black">#{item.printNumber}</span>
                                        </div>
                                      )}
                                    </div>
                                    <p className="font-black text-slate-900 text-xs">{formatBDT(item.price * item.quantity)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Live Pathao Courier Tracking Timeline */}
                            {order.pathaoConsignmentId && (
                              <div className="space-y-3">
                                <p className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                  <Truck className="w-4 h-4 text-[#800020]" /> Live Delivery Status (Pathao Courier)
                                </p>

                                <div className="bg-white border border-slate-100 p-5 rounded-none">
                                  {loadingTracking ? (
                                    <div className="flex items-center gap-2 text-xs text-slate-500 py-2 justify-center">
                                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> Fetching live tracking information...
                                    </div>
                                  ) : liveTrackingInfo ? (
                                    <div className="space-y-4">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                        <div>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase">Consignment ID:</span>
                                          <span className="text-xs font-bold text-slate-800 ml-1.5">{order.pathaoConsignmentId}</span>
                                        </div>
                                        <div>
                                          <span className="text-[10px] font-bold text-slate-400 uppercase">Current Status:</span>
                                          <span className="ml-1.5 text-xs font-black text-[#800020] uppercase bg-rose-50 px-2 py-0.5 border border-rose-100">
                                            {liveTrackingInfo.current_status || "In Transit"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Consignment Timeline / Description */}
                                      <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 border border-slate-100 flex items-start gap-2.5">
                                        <AlertCircle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                          <p className="font-bold text-slate-800">Tracking Statement:</p>
                                          <p className="mt-0.5 text-slate-600">The consignment is handled by Pathao Courier. Current check-point shows: "{liveTrackingInfo.current_status}". Last updated: {liveTrackingInfo.update_time ? formatDate(liveTrackingInfo.update_time) : "recently"}.</p>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500 italic py-2 text-center">Tracking data is temporarily unavailable. Pathao consignment ID is: {order.pathaoConsignmentId}</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Summary & Invoice Print Actions */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-100 p-4">
                              <div className="text-xs text-slate-500 space-y-1">
                                <p>Shipping Address: <span className="font-semibold text-slate-800">{order.address}</span></p>
                                {order.remarks && <p>Remarks: <span className="italic">"{order.remarks}"</span></p>}
                              </div>
                              <div className="flex gap-3 w-full sm:w-auto">
                                <a
                                  href={`/account/orders/${order.id}/invoice`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 sm:flex-none px-4 py-2 bg-[#800020] hover:bg-[#600018] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                                >
                                  <Download className="w-4 h-4" /> Invoice
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──────── TAB: ADDRESSES ──────── */}
            {activeTab === "addresses" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-wide">Saved Addresses</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Manage up to 2 addresses for shipping checkout speed.</p>
                  </div>
                  <button
                    onClick={openAddModal}
                    disabled={addresses.length >= 2}
                    className="px-4 py-2.5 bg-[#800020] hover:bg-[#600018] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" /> Add Address
                  </button>
                </div>

                {addresses.length === 0 ? (
                  <div className="bg-white border border-slate-200 p-12 text-center">
                    <MapPinned className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="font-bold text-slate-800 text-base">No saved addresses</p>
                    <p className="text-xs text-slate-500 mt-1 mb-6">Add your shipping details for lightning fast checkouts.</p>
                    <button
                      onClick={openAddModal}
                      className="bg-[#800020] text-white px-5 py-2.5 text-xs font-black tracking-widest uppercase hover:bg-[#600018] transition-colors"
                    >
                      Add First Address
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {addresses.map((addr) => (
                      <div key={addr.id} className={`bg-white p-6 border shadow-sm relative flex flex-col justify-between ${addr.isDefault ? "border-primary ring-1 ring-primary" : "border-slate-200"}`}>
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 font-bold text-[10px] uppercase tracking-wider">
                              {addr.label}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-black uppercase text-[#800020] bg-rose-50 px-2 py-0.5">
                                Default
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-sm text-slate-900">{addr.fullName}</h4>
                          <p className="text-xs text-slate-600 mt-1.5">{addr.phone}</p>
                          <p className="text-xs text-slate-600 mt-1">{addr.address}</p>
                          <p className="text-xs font-bold text-slate-500 mt-1.5">{addr.district}</p>
                        </div>

                        <div className="flex items-center gap-3 border-t border-slate-100 mt-5 pt-4">
                          <button
                            onClick={() => openEditModal(addr)}
                            className="text-xs font-bold text-[#800020] hover:underline flex items-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" /> Edit
                          </button>
                          <span className="text-slate-200">&bull;</span>
                          <button
                            onClick={() => addr.id && handleDeleteAddress(addr.id)}
                            className="text-xs font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──────── TAB: PROFILE ──────── */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-lg font-black uppercase tracking-wide">Account Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Verify your personal profile registration details.</p>
                </div>

                <div className="bg-white border border-slate-200 p-6 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{customer.name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phone Number</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{customer.phone}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email Address</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{customer.email || "Not Provided"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Registration Date</span>
                      <p className="font-bold text-slate-900 text-sm mt-0.5">{formatDate(customer.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ──────── ADDRESS MODAL FORM ──────── */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg border border-slate-200 p-6 sm:p-8 shadow-2xl relative animate-fadeIn max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddressModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-black uppercase tracking-wide border-b border-slate-100 pb-3 mb-6">
              {editingAddress ? "Edit Shipping Address" : "Add Shipping Address"}
            </h3>

            {modalError && (
              <div className="mb-5 p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddressSubmit} className="space-y-4">
              {/* Address label */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">Address Label</label>
                <div className="flex gap-2">
                  {["Home", "Office", "Other"].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setAddressLabel(l)}
                      className={`flex-1 py-2 text-xs font-bold transition-all border ${addressLabel === l
                          ? "bg-[#800020] text-white border-primary"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={addressName}
                    onChange={(e) => setAddressName(e.target.value)}
                    className="w-full px-3 h-10 border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:border-slate-950 font-medium"
                    placeholder="Recipient's name"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={addressPhone}
                    onChange={(e) => setAddressPhone(e.target.value)}
                    className="w-full px-3 h-10 border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:border-slate-950 font-medium"
                    placeholder="e.g. 017xxxxxxxx"
                    required
                  />
                </div>
              </div>

              {/* Pathao selectors */}
              <div className="space-y-3.5 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">City *</label>
                  <CustomSelect
                    options={cities}
                    value={selectedCityId?.toString() || ""}
                    onChange={(val) => setSelectedCityId(parseInt(val))}
                    placeholder={loadingLocations ? "Loading cities..." : "-- Select City --"}
                    searchable={true}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">Zone *</label>
                    <CustomSelect
                      options={zones}
                      value={selectedZoneId?.toString() || ""}
                      onChange={(val) => setSelectedZoneId(parseInt(val))}
                      placeholder={selectedCityId ? "-- Select Zone --" : "First select a city"}
                      disabled={!selectedCityId}
                      searchable={true}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">Area *</label>
                    <CustomSelect
                      options={areas}
                      value={selectedAreaId?.toString() || ""}
                      onChange={(val) => setSelectedAreaId(parseInt(val))}
                      placeholder={selectedZoneId ? "-- Select Area --" : "First select a zone"}
                      disabled={!selectedZoneId}
                      searchable={true}
                    />
                  </div>
                </div>
              </div>

              {/* Specific Street Detail address */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1">House, Street, Flat details *</label>
                <textarea
                  value={addressDetails}
                  onChange={(e) => setAddressDetails(e.target.value)}
                  rows={2.5}
                  className="w-full p-3 border border-slate-200 bg-slate-50/50 text-xs focus:outline-none focus:bg-white focus:border-slate-950 font-medium resize-none"
                  placeholder="e.g. House 12, Road 4, Block C, near central mosque"
                  required
                />
              </div>

              {/* Default checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="default-chk"
                  checked={isDefaultAddress}
                  disabled={addresses.length === 0} // First address MUST be default
                  onChange={(e) => setIsDefaultAddress(e.target.checked)}
                  className="w-4 h-4 border-slate-300 text-primary focus:ring-primary"
                />
                <label htmlFor="default-chk" className="text-xs font-semibold text-slate-600 cursor-pointer">
                  Set as default shipping address
                </label>
              </div>

              {/* Submit button */}
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || loadingLocations}
                  className="flex-1 py-2.5 bg-[#800020] hover:bg-[#600018] text-white text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-75"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Details"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer config={footerData} />
      <SidebarCart />
    </div>
  );
}
