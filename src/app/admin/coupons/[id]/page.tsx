import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDateTime } from "@/utils/formatDate";
import { 
  ArrowLeft, 
  Ticket, 
  DollarSign, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ShoppingBag, 
  Edit2, 
  FileText, 
  Settings, 
  UserCheck, 
  Layers, 
  ExternalLink 
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CouponDetailPage({ params }: { params: { id: string } }) {
  const session = await getSession();
  const canView = hasPermission(session, "VIEW", "COUPONS");
  const canEdit = hasPermission(session, "EDIT", "COUPONS");

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md bg-white shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-slate-100 rounded-none p-8 md:p-10 text-center flex flex-col items-center animate-fade-in">
          <div className="w-12 h-12 bg-red-50 rounded-none flex items-center justify-center mb-6">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-3">Access Restricted</h2>
          <p className="text-sm text-slate-500 mb-2 leading-relaxed max-w-xs font-normal">
            You do not have permission to view coupon details. Please contact your administrator to assign permissions for your working area.
          </p>
        </div>
      </div>
    );
  }

  const coupon = await prisma.coupon.findUnique({
    where: { id: params.id }
  });

  if (!coupon || coupon.deletedAt) {
    notFound();
  }

  // Calculate Aggregates
  const totalDiscountResult = await prisma.couponUsage.aggregate({
    where: { couponId: coupon.id },
    _sum: {
      discountAmount: true
    }
  });
  const totalDiscountsGiven = totalDiscountResult._sum.discountAmount ?? 0;

  const totalUsagesCount = await prisma.couponUsage.count({
    where: { couponId: coupon.id }
  });

  const activeLocks = await prisma.couponLock.count({
    where: {
      couponId: coupon.id,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  // Fetch usage logs (take 50 for page sanity)
  const usages = await prisma.couponUsage.findMany({
    where: { couponId: coupon.id },
    include: {
      customer: true,
      order: true
    },
    orderBy: {
      usedAt: "desc"
    },
    take: 50
  });

  // Fetch Whitelist/Blacklist labels
  let includedProducts: { id: string; name: string }[] = [];
  if (coupon.includedProductIds.length > 0) {
    includedProducts = await prisma.product.findMany({
      where: { id: { in: coupon.includedProductIds } },
      select: { id: true, name: true }
    });
  }

  let excludedProducts: { id: string; name: string }[] = [];
  if (coupon.excludedProductIds.length > 0) {
    excludedProducts = await prisma.product.findMany({
      where: { id: { in: coupon.excludedProductIds } },
      select: { id: true, name: true }
    });
  }

  let includedCategories: { id: string; name: string }[] = [];
  if (coupon.includedCategoryIds.length > 0) {
    includedCategories = await prisma.category.findMany({
      where: { id: { in: coupon.includedCategoryIds } },
      select: { id: true, name: true }
    });
  }

  let excludedCategories: { id: string; name: string }[] = [];
  if (coupon.excludedCategoryIds.length > 0) {
    excludedCategories = await prisma.category.findMany({
      where: { id: { in: coupon.excludedCategoryIds } },
      select: { id: true, name: true }
    });
  }

  // Status computation
  const now = new Date();
  const start = coupon.startDate ? new Date(coupon.startDate) : null;
  const end = coupon.endDate ? new Date(coupon.endDate) : null;
  const isExpired = end && now > end;
  const isNotStarted = start && now < start;

  let statusLabel = "Active";
  let statusColorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let StatusIcon = CheckCircle2;

  if (!coupon.isActive) {
    statusLabel = "Inactive";
    statusColorClass = "bg-slate-50 text-slate-600 border-slate-200";
    StatusIcon = XCircle;
  } else if (isExpired) {
    statusLabel = "Expired";
    statusColorClass = "bg-rose-50 text-rose-700 border-rose-200";
    StatusIcon = XCircle;
  } else if (isNotStarted) {
    statusLabel = "Upcoming";
    statusColorClass = "bg-amber-50 text-amber-700 border-amber-200";
    StatusIcon = AlertCircle;
  }

  const usageLimit = coupon.usageLimitTotal;
  const usagePercentage = usageLimit ? Math.min(100, Math.round((totalUsagesCount / usageLimit) * 100)) : null;

  return (
    <div className="flex flex-col gap-6 w-full pb-12 px-4 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-4">
          <Link href="/admin/coupons" className="p-2 bg-slate-100 hover:bg-slate-200 rounded-none transition-colors text-slate-500 font-bold flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Coupon: <span className="font-mono text-indigo-600">{coupon.code}</span>
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-xs font-semibold ${statusColorClass}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusLabel}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Performance statistics, lock details, and historical audit logs.
            </p>
          </div>
        </div>

        {canEdit && (
          <Link
            href={`/admin/coupons/edit/${coupon.id}`}
            className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-none flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-none active:scale-[0.98]"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit Coupon Code
          </Link>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI Card 1: Usages */}
        <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Claimed Usages</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{totalUsagesCount}</span>
              <span className="text-sm font-medium text-slate-400">/ {usageLimit !== null ? usageLimit : "∞"}</span>
            </div>
            <p className="text-xs text-slate-400">
              {usageLimit ? `${usageLimit - totalUsagesCount} remaining claims available` : "Unlimited usages permitted"}
            </p>
            {usagePercentage !== null && (
              <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-none overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${usagePercentage > 90 ? 'bg-rose-500' : usagePercentage > 50 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
            )}
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* KPI Card 2: Discounts Given */}
        <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue Impact</p>
            <p className="text-2xl font-bold text-slate-900">৳{totalDiscountsGiven.toLocaleString()}</p>
            <p className="text-xs text-slate-400">Total discount value applied to checkouts</p>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* KPI Card 3: Active Locks */}
        <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Cart Locks</p>
            <p className="text-2xl font-bold text-slate-900">{activeLocks}</p>
            <p className="text-xs text-slate-400">Claim sessions currently locked in checkouts</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Details and Usage log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column (2/3) - Usage History Log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-6 border-b border-slate-100 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Usage History Log
            </h2>

            <div className="overflow-x-auto border border-slate-100">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Order ID</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Discount</th>
                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usages.map((usage) => (
                    <tr key={usage.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-800">
                            {usage.customer?.name || "Guest User"}
                          </span>
                          <span className="text-xs text-slate-400 font-mono">
                            {usage.phone}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link 
                          href={`/admin/orders/${usage.orderId}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline font-mono"
                        >
                          {usage.orderId}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900">
                        ৳{usage.discountAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {formatDateTime(usage.usedAt)}
                      </td>
                    </tr>
                  ))}
                  {usages.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-sm font-semibold text-slate-400 uppercase tracking-wider">
                        No checkouts have used this coupon yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {usages.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-4 text-right">
                Showing the most recent {usages.length} claimed usages
              </p>
            )}
          </div>
        </div>

        {/* Right column (1/3) - Applied Restrictions & Config */}
        <div className="space-y-6">
          
          {/* Card 1: Configuration */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600" />
              General Configuration
            </h2>

            <div className="space-y-3.5">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-xs font-semibold text-slate-500">Coupon Type</span>
                <span className="text-xs font-bold text-slate-900 uppercase">
                  {coupon.type.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-xs font-semibold text-slate-500">Discount Value</span>
                <span className="text-xs font-bold text-slate-900">
                  {coupon.type === "FREE_SHIPPING" ? (
                    "Waives Shipping 🚚"
                  ) : coupon.type === "PERCENTAGE" ? (
                    `${coupon.value}%`
                  ) : (
                    `৳${coupon.value.toLocaleString()}`
                  )}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-xs font-semibold text-slate-500">Starts On</span>
                <span className="text-xs font-bold text-slate-700">
                  {coupon.startDate ? formatDateTime(coupon.startDate) : "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-xs font-semibold text-slate-500">Expires On</span>
                <span className="text-xs font-bold text-slate-700">
                  {coupon.endDate ? formatDateTime(coupon.endDate) : "Infinite"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-xs font-semibold text-slate-500">Limit Per User</span>
                <span className="text-xs font-bold text-slate-700">
                  {coupon.usageLimitPerUser} {coupon.usageLimitPerUser === 1 ? "claim" : "claims"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-semibold text-slate-500">Created Date</span>
                <span className="text-xs font-medium text-slate-400">
                  {formatDateTime(coupon.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Cart Rules */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Minimum & Maximum Cart Limits
            </h2>

            <div className="space-y-3.5">
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-xs font-semibold text-slate-500">Minimum Cart Spend</span>
                <span className="text-xs font-bold text-slate-900">
                  {coupon.minCartValue ? `৳${coupon.minCartValue.toLocaleString()}` : "৳0 (No Min)"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-xs font-semibold text-slate-500">Maximum Cart Spend</span>
                <span className="text-xs font-bold text-slate-900">
                  {coupon.maxCartValue ? `৳${coupon.maxCartValue.toLocaleString()}` : "No Max Limit"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-xs font-semibold text-slate-500">Max Discount Amount</span>
                <span className="text-xs font-bold text-indigo-600">
                  {coupon.maxDiscountAmount ? `৳${coupon.maxDiscountAmount.toLocaleString()}` : "Uncapped"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-xs font-semibold text-slate-500">Exclude Sale Items</span>
                <span className={`text-xs font-bold ${coupon.excludeSaleItems ? "text-rose-600" : "text-slate-400"}`}>
                  {coupon.excludeSaleItems ? "Yes, Excluded" : "No, Allowed"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs font-semibold text-slate-500">Target Segment</span>
                <span className="text-xs font-bold text-slate-900 uppercase">
                  {coupon.customerSegment || "ALL CUSTOMERS"}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Specific Targeting Whitelists & Blacklists */}
          <div className="bg-white border border-slate-200 rounded-none p-6 shadow-none">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Targeting Whitelists & Blacklists
            </h2>

            <div className="space-y-4 text-xs">
              {/* Whitelisted Products */}
              <div>
                <p className="font-semibold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">
                  Whitelisted Products ({includedProducts.length})
                </p>
                {includedProducts.length > 0 ? (
                  <div className="flex flex-col gap-1 pl-2 border-l-2 border-emerald-500">
                    {includedProducts.map(p => (
                      <span key={p.id} className="font-semibold text-slate-700">
                        {p.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Global (All products whitelisted)</span>
                )}
              </div>

              {/* Blacklisted Products */}
              <div>
                <p className="font-semibold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">
                  Blacklisted Products ({excludedProducts.length})
                </p>
                {excludedProducts.length > 0 ? (
                  <div className="flex flex-col gap-1 pl-2 border-l-2 border-rose-500">
                    {excludedProducts.map(p => (
                      <span key={p.id} className="font-semibold text-slate-700">
                        {p.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">None</span>
                )}
              </div>

              {/* Whitelisted Categories */}
              <div>
                <p className="font-semibold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">
                  Whitelisted Categories ({includedCategories.length})
                </p>
                {includedCategories.length > 0 ? (
                  <div className="flex flex-col gap-1 pl-2 border-l-2 border-emerald-500">
                    {includedCategories.map(c => (
                      <span key={c.id} className="font-semibold text-slate-700">
                        {c.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">Global (All categories whitelisted)</span>
                )}
              </div>

              {/* Blacklisted Categories */}
              <div>
                <p className="font-semibold text-slate-500 mb-1.5 uppercase tracking-wider text-[10px]">
                  Blacklisted Categories ({excludedCategories.length})
                </p>
                {excludedCategories.length > 0 ? (
                  <div className="flex flex-col gap-1 pl-2 border-l-2 border-rose-500">
                    {excludedCategories.map(c => (
                      <span key={c.id} className="font-semibold text-slate-700">
                        {c.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">None</span>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
