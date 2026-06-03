"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SidebarCart from "@/components/SidebarCart";
import { FooterData } from "@/lib/footer";
import { LogOut, Package, MapPin, User } from "lucide-react";
import { logoutCustomerAction } from "../actions/customerAuth";
import OrdersTab from "./components/OrdersTab";
import AddressesTab from "./components/AddressesTab";
import ProfileTab from "./components/ProfileTab";

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
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as "orders" | "addresses" | "profile" | null;
  const [activeTab, setActiveTab] = useState<"orders" | "addresses" | "profile">(tabParam || "orders");

  // Update active tab when URL parameter changes
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  // Logout Handler
  const handleLogout = async () => {
    const res = await logoutCustomerAction();
    if (res.success) {
      router.push("/");
      router.refresh();
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-10 max-w-6xl">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-5 text-center sm:text-left flex-col sm:flex-row">
            <div className="w-16 h-16 rounded-full bg-[#800020]/5 text-[#800020] flex items-center justify-center font-medium text-2xl border border-[#800020]/10">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-light text-slate-900 tracking-tight leading-tight">
                Welcome, <span className="font-semibold">{customer.name}</span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">Member since {formatDate(customer.createdAt)}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium transition-all flex items-center gap-2 rounded bg-white shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>

        {/* Dashboard Core Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar Menu */}
          <aside className="w-full lg:w-1/5">
            <nav className="flex flex-row lg:flex-col gap-1.5 sticky top-28 pb-4 lg:pb-0">
              <button
                onClick={() => setActiveTab("orders")}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-all rounded-lg border ${
                  activeTab === "orders"
                    ? "text-[#800020] bg-white shadow-sm border-slate-100 font-semibold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/40 border-transparent"
                }`}
              >
                <Package className="w-4 h-4" />
                <span>My Orders</span>
              </button>

              <button
                onClick={() => setActiveTab("addresses")}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-all rounded-lg border ${
                  activeTab === "addresses"
                    ? "text-[#800020] bg-white shadow-sm border-slate-100 font-semibold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/40 border-transparent"
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Address Book</span>
              </button>

              <button
                onClick={() => setActiveTab("profile")}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-all rounded-lg border ${
                  activeTab === "profile"
                    ? "text-[#800020] bg-white shadow-sm border-slate-100 font-semibold"
                    : "text-slate-500 hover:text-slate-900 hover:bg-white/40 border-transparent"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Profile Settings</span>
              </button>
            </nav>
          </aside>

          {/* Right Main Content */}
          <div className="flex-1 bg-white rounded-xl border border-slate-100 p-6 md:p-8 shadow-sm">
            {/* ──────── TAB: ORDERS ──────── */}
            {activeTab === "orders" && <OrdersTab orders={orders} />}

            {/* ──────── TAB: ADDRESSES ──────── */}
            {activeTab === "addresses" && <AddressesTab addresses={initialAddresses} customer={customer} />}

            {/* ──────── TAB: PROFILE ──────── */}
            {activeTab === "profile" && <ProfileTab customer={customer} />}
          </div>
        </div>
      </main>

      <Footer config={footerData} />
      <SidebarCart />
    </div>
  );
}
