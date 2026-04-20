"use client";

import { useState } from "react";
import { createAccount } from "./actions";
import { useRouter } from "next/navigation";

export default function CreateAccountClient({ onSuccessCallback }: { onSuccessCallback?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    name: "",
    type: "INCOME" as "INCOME" | "EXPENSE" | "ASSET" | "LIABILITY",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!form.name) {
      setError("Account name is required.");
      setLoading(false);
      return;
    }

    const { success, error } = await createAccount({
      name: form.name,
      type: form.type,
      status: "ACTIVE",
    });

    if (success) {
      setSuccess("Account created successfully.");
      setForm({ ...form, name: "" });
      router.refresh();
      if (onSuccessCallback) onSuccessCallback();
    } else {
      setError(error || "Failed to create account.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm mt-6">
      <h3 className="text-sm font-medium text-gray-900 mb-4">Create New Account</h3>
      
      {error && <div className="mb-3 text-xs text-red-600">{error}</div>}
      {success && <div className="mb-3 text-xs text-green-600">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full h-9 px-3 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
            placeholder="Account Name (e.g. Sales, Rent)"
          />
        </div>
        <div className="flex space-x-2">
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            className="flex-1 h-9 px-3 py-1 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
          >
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="ASSET">Asset</option>
            <option value="LIABILITY">Liability</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="h-9 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-black disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}
