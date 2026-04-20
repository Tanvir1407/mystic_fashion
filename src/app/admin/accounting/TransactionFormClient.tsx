"use client";

import { useState } from "react";
import { storeTransaction } from "./actions";
import { useRouter } from "next/navigation";

export default function TransactionFormClient({ accounts, onSuccessCallback }: { accounts: any[], onSuccessCallback?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    accountId: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    referenceId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!form.accountId || !form.amount || !form.date || !form.description) {
      setError("Please fill all required fields.");
      setLoading(false);
      return;
    }

    const { success, error } = await storeTransaction({
      accountId: form.accountId,
      amount: parseFloat(form.amount),
      date: form.date,
      description: form.description,
      referenceId: form.referenceId || 'N/A',
    });

    if (success) {
      setSuccess("Transaction saved successfully.");
      setForm({
        accountId: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        referenceId: "",
      });
      router.refresh();
      if (onSuccessCallback) onSuccessCallback();
    } else {
      setError(error || "Failed to save transaction.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm relative">
      <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
        <svg className="w-5 h-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        New Transaction
      </h3>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
      {success && <div className="mb-4 text-sm text-green-600 bg-green-50 p-3 rounded-lg border border-green-100">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Account *</label>
          <select
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            className="w-full h-11 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm bg-white transition-colors"
          >
            <option value="">Select Account</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.type})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">৳</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full h-11 pl-7 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm transition-colors"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full h-11 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Description *</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full h-11 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm transition-colors"
            placeholder="E.g. Sales Revenue from Store"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Reference ID (Optional)</label>
          <input
            type="text"
            value={form.referenceId}
            onChange={(e) => setForm({ ...form, referenceId: e.target.value })}
            className="w-full h-11 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-black focus:ring-1 focus:ring-black text-sm transition-colors"
            placeholder="Order # or Purchase #"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? "Recording..." : "Record Transaction"}
          </button>
        </div>
      </form>
    </div>
  );
}
