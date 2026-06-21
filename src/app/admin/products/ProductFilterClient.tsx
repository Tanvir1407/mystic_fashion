"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, X, Filter, Star, EyeOff } from "lucide-react";

export default function ProductFilterClient({
  currentSearch = "",
  currentCategory = "ALL",
  categories = [],
  featuredOnly = false,
  hiddenOnly = false,
}: {
  currentSearch?: string;
  currentCategory?: string;
  categories?: string[];
  featuredOnly?: boolean;
  hiddenOnly?: boolean;
}) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(currentSearch);

  useEffect(() => {
    setSearchValue(currentSearch);
  }, [currentSearch]);

  const handleSearch = () => {
    const params = new URLSearchParams(window.location.search);
    if (searchValue) params.set("search", searchValue);
    else params.delete("search");

    params.set("page", "1");
    router.push(`/admin/products?${params.toString()}`);
  };

  return (
    <div className="w-full bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 flex flex-col xl:flex-row xl:items-center gap-4 justify-between">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-1">
          {/* Search Block */}
          <div className="flex-1 relative group max-w-[350px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <SearchIcon className="h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search by name, team, or category..."
              value={searchValue}
              onChange={(e) => {
                const val = e.target.value;
                setSearchValue(val);
                if (val === "") {
                  const params = new URLSearchParams(window.location.search);
                  params.delete("search");
                  params.set("page", "1");
                  router.push(`/admin/products?${params.toString()}`);
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="block w-full pl-10 pr-24 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-4 focus:ring-slate-500/10 focus:border-slate-300 focus:bg-white transition-all outline-none font-medium text-slate-900 placeholder:text-slate-400"
            />
            <div className="absolute inset-y-0 right-0 pr-1 flex items-center gap-1">
              {searchValue && (
                <button
                  onClick={() => {
                    setSearchValue("");
                    const params = new URLSearchParams(window.location.search);
                    params.delete("search");
                    params.set("page", "1");
                    router.push(`/admin/products?${params.toString()}`);
                  }}
                  className="p-1.5 hover:bg-slate-200 rounded-md transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleSearch}
                className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-slate-200 hidden md:block" />

          {/* Category Filter */}
          <div className="flex items-center gap-3">
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
              className="w-48 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-4 focus:ring-slate-500/10 focus:border-slate-300 outline-none transition-all cursor-pointer text-slate-700"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <div className="h-8 w-px bg-slate-200" />

            {/* Featured Filter Toggle */}
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                if (featuredOnly) params.delete("featured");
                else params.set("featured", "true");
                params.set("page", "1");
                router.push(`/admin/products?${params.toString()}`);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                featuredOnly
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-600"
              }`}
            >
              <Star className={`w-4 h-4 ${featuredOnly ? "fill-amber-400 text-amber-400" : ""}`} />
              Featured
            </button>

            {/* Hidden Filter Toggle */}
            <button
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                if (hiddenOnly) params.delete("hidden");
                else params.set("hidden", "true");
                params.set("page", "1");
                router.push(`/admin/products?${params.toString()}`);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border transition-all ${
                hiddenOnly
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
              }`}
            >
              <EyeOff className="w-4 h-4" />
              Hidden
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
