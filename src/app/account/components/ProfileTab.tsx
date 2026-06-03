"use client";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  createdAt: string;
}

interface ProfileTabProps {
  customer: Customer;
}

export default function ProfileTab({ customer }: ProfileTabProps) {
  // Format Date utility
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-base font-medium text-slate-900 tracking-tight">Account Details</h2>
        <p className="text-xs text-slate-400 font-light mt-0.5">
          Verify your personal profile registration details.
        </p>
      </div>

      <div className="space-y-6 max-w-2xl mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Full Name
            </span>
            <p className="font-semibold text-slate-900 text-sm mt-1">{customer.name}</p>
          </div>
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Phone Number
            </span>
            <p className="font-semibold text-slate-900 text-sm mt-1">{customer.phone}</p>
          </div>
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Email Address
            </span>
            <p className="font-semibold text-slate-900 text-sm mt-1">{customer.email || "Not Provided"}</p>
          </div>
          <div className="border-b border-slate-100 pb-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Registration Date
            </span>
            <p className="font-semibold text-slate-900 text-sm mt-1">{formatDate(customer.createdAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
