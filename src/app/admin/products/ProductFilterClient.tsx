"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, X, Filter } from "lucide-react";

export default function ProductFilterClient({
  currentSearch = "",
  currentCategory = "ALL",
  categories = []
}: {
  currentSearch?: string;
  currentCategory?: string;
  categories?: string[];
}) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentSearch);

  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  useEffect(() => {
    if (searchValue === currentSearch) return;

    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (searchValue) params.set("search", searchValue);
      else params.delete("search");
      
      params.set("page", "1");
      router.push(`/admin/products?${params.toString()}`);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue, currentSearch, router]);

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 w-full bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
      {/* Search Block */}
      <div className="flex-1 relative group min-w-[250px]">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <SearchIcon className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input
          type="text"
          placeholder="Search by name, team, or category..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="block w-full pl-10 pr-12 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400"
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
          {searchValue && (
            <button
              onClick={() => {
                setSearchValue("");
                const params = new URLSearchParams(window.location.search);
                params.delete("search");
                params.set("page", "1");
                router.push(`/admin/products?${params.toString()}`);
              }}
              className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="h-6 w-px bg-slate-200 hidden md:block" />

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-500" />
        <select
          value={currentCategory}
          onChange={(e) => {
            const val = e.target.value;
            const params = new URLSearchParams(window.location.search);
            if (val !== "ALL") params.set("category", val);
            else params.delete("category");
            params.set("page", "1");
            router.push(`/admin/products?${params.toString()}`);
          }}
          className="w-48 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all cursor-pointer"
        >
          <option value="ALL">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
