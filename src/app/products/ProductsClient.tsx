"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, SlidersHorizontal, X, Check, Grid, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "@/components/ProductCard";

interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

interface Brand {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  purchasePrice: number | null;
  images: string[];
  team: string | null;
  category: string;
  brandId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  createdAt: Date;
  isFeatured: boolean;
  isPublished: boolean;
  brand?: Brand | null;
  categoryRel?: Category | null;
  subcategory?: Subcategory | null;
  discount?: {
    id: string;
    name: string;
    discountType: "FLAT" | "PERCENTAGE";
    value: number;
    active: boolean;
  } | null;
  variants?: any[];
}

interface ProductsClientProps {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  initialCategory?: string;
  initialBrand?: string;
  initialSubcategory?: string;
}

// Helper to calculate product final price after active discount
const getFinalPrice = (product: Product): number => {
  let finalPrice = product.price;
  if (product.discount && product.discount.active) {
    if (product.discount.discountType === "PERCENTAGE") {
      finalPrice = product.price - (product.price * (product.discount.value / 100));
    } else {
      finalPrice = Math.max(0, product.price - product.discount.value);
    }
  }
  return Math.round(finalPrice);
};

export default function ProductsClient({
  products,
  categories,
  brands,
  initialCategory,
  initialBrand,
  initialSubcategory,
}: ProductsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Calculate the global min and max prices from published products
  const { globalMinPrice, globalMaxPrice } = useMemo(() => {
    if (products.length === 0) return { globalMinPrice: 0, globalMaxPrice: 10000 };
    const prices = products.map(getFinalPrice);
    return {
      globalMinPrice: Math.min(...prices),
      globalMaxPrice: Math.max(...prices),
    };
  }, [products]);

  // State initialized directly with initial props for perfect server-client sync!
  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    if (initialCategory) {
      const foundCat = categories.find(
        (c) =>
          c.id === initialCategory ||
          c.name.toLowerCase() === initialCategory.toLowerCase()
      );
      return foundCat ? foundCat.id : initialCategory;
    }
    return null;
  });

  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(() => {
    return initialSubcategory || null;
  });

  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    if (initialBrand) {
      const foundBrand = brands.find(
        (b) =>
          b.id === initialBrand ||
          b.name.toLowerCase() === initialBrand.toLowerCase()
      );
      return foundBrand ? [foundBrand.id] : [initialBrand];
    }
    return [];
  });

  const [minPriceInput, setMinPriceInput] = useState<string>(globalMinPrice.toString());
  const [maxPriceInput, setMaxPriceInput] = useState<string>(globalMaxPrice.toString());
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  // Expand category by default if selected category is active
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    if (initialCategory) {
      const foundCat = categories.find(
        (c) =>
          c.id === initialCategory ||
          c.name.toLowerCase() === initialCategory.toLowerCase()
      );
      if (foundCat) {
        return { [foundCat.id]: true };
      }
    }
    return {};
  });

  // Sync initial query params to states (for back button / path change navigation)
  useEffect(() => {
    if (initialCategory) {
      const foundCat = categories.find(
        (c) =>
          c.id === initialCategory ||
          c.name.toLowerCase() === initialCategory.toLowerCase()
      );
      setSelectedCategory(foundCat ? foundCat.id : initialCategory);
      if (foundCat) {
        setExpandedCategories((prev) => ({ ...prev, [foundCat.id]: true }));
      }
    } else {
      setSelectedCategory(null);
    }

    if (initialSubcategory) {
      setSelectedSubcategory(initialSubcategory);
    } else {
      setSelectedSubcategory(null);
    }

    if (initialBrand) {
      const foundBrand = brands.find(
        (b) =>
          b.id === initialBrand ||
          b.name.toLowerCase() === initialBrand.toLowerCase()
      );
      setSelectedBrands(foundBrand ? [foundBrand.id] : [initialBrand]);
    } else {
      setSelectedBrands([]);
    }
  }, [initialCategory, initialBrand, initialSubcategory, categories, brands]);

  // Set default min/max inputs when global prices are loaded or changed
  useEffect(() => {
    setMinPriceInput(globalMinPrice.toString());
    setMaxPriceInput(globalMaxPrice.toString());
  }, [globalMinPrice, globalMaxPrice]);

  // Toggle brand selection
  const handleToggleBrand = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId) ? prev.filter((id) => id !== brandId) : [...prev, brandId]
    );
  };

  // Toggle Category Expand
  const toggleExpandCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Select Category
  const handleSelectCategory = (categoryId: string | null) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      updateQueryParams({ category: undefined, subcategory: undefined });
    } else {
      setSelectedCategory(categoryId);
      setSelectedSubcategory(null);
      const catObj = categories.find((c) => c.id === categoryId);
      updateQueryParams({
        category: catObj ? catObj.name.toLowerCase() : undefined,
        subcategory: undefined,
      });
      if (categoryId) {
        setExpandedCategories((prev) => ({ ...prev, [categoryId]: true }));
      }
    }
  };

  // Select Subcategory
  const handleSelectSubcategory = (subcategoryId: string | null, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent category selection trigger
    if (selectedSubcategory === subcategoryId) {
      setSelectedSubcategory(null);
      updateQueryParams({ subcategory: undefined });
    } else {
      setSelectedSubcategory(subcategoryId);
      const subObj = categories
        .flatMap((c) => c.subcategories)
        .find((s) => s.id === subcategoryId);
      updateQueryParams({ subcategory: subObj ? subObj.name.toLowerCase() : undefined });
    }
  };

  // Helper to update URL query params seamlessly
  const updateQueryParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedBrands([]);
    setMinPriceInput(globalMinPrice.toString());
    setMaxPriceInput(globalMaxPrice.toString());
    setSortBy("newest");
    router.replace(pathname, { scroll: false });
  };

  const isAnyFilterActive = useMemo(() => {
    return (
      selectedCategory !== null ||
      selectedSubcategory !== null ||
      selectedBrands.length > 0 ||
      Number(minPriceInput) !== globalMinPrice ||
      Number(maxPriceInput) !== globalMaxPrice ||
      sortBy !== "newest"
    );
  }, [selectedCategory, selectedSubcategory, selectedBrands, minPriceInput, maxPriceInput, sortBy, globalMinPrice, globalMaxPrice]);

  // Compute final filtered products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 1. Filter by category
    if (selectedCategory) {
      result = result.filter((p) => {
        const catName = categories.find((c) => c.id === selectedCategory)?.name.toLowerCase();
        return (
          p.categoryId === selectedCategory ||
          (p.categoryRel && p.categoryRel.id === selectedCategory) ||
          p.category.toLowerCase() === selectedCategory.toLowerCase() ||
          (catName && p.category.toLowerCase() === catName)
        );
      });
    }

    // 2. Filter by subcategory
    if (selectedSubcategory) {
      result = result.filter((p) => {
        const subName = categories
          .flatMap((c) => c.subcategories)
          .find((s) => s.id === selectedSubcategory)?.name.toLowerCase();
        return (
          p.subcategoryId === selectedSubcategory ||
          (p.subcategory && p.subcategory.id === selectedSubcategory) ||
          (subName && p.subcategory && p.subcategory.name.toLowerCase() === subName)
        );
      });
    }

    // 3. Filter by brand
    if (selectedBrands.length > 0) {
      result = result.filter((p) => p.brandId && selectedBrands.includes(p.brandId));
    }

    // 4. Filter by price range
    const minP = Number(minPriceInput) || 0;
    const maxP = Number(maxPriceInput) || Infinity;
    result = result.filter((p) => {
      const price = getFinalPrice(p);
      return price >= minP && price <= maxP;
    });

    // 5. Sort products
    if (sortBy === "price-asc") {
      result.sort((a, b) => getFinalPrice(a) - getFinalPrice(b));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => getFinalPrice(b) - getFinalPrice(a));
    } else {
      // Default: newest
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [products, selectedCategory, selectedSubcategory, selectedBrands, minPriceInput, maxPriceInput, sortBy, categories]);

  // Active Category/Subcategory text for heading
  const activeHeadingText = useMemo(() => {
    if (selectedSubcategory) {
      const subObj = categories.flatMap((c) => c.subcategories).find((s) => s.id === selectedSubcategory);
      if (subObj) return subObj.name;
    }
    if (selectedCategory) {
      const catObj = categories.find((c) => c.id === selectedCategory);
      if (catObj) return catObj.name;
    }
    return "All Products";
  }, [selectedCategory, selectedSubcategory, categories]);

  return (
    <div className="w-full bg-slate-50 dark:bg-zinc-950 py-6 border-t border-slate-200 dark:border-zinc-800">
      <div className="container mx-auto px-4 md:px-0">

        {/* Banner/Heading Block */}
        <div className="mb-8 md:mb-10 text-left border-b border-slate-200 dark:border-zinc-900 pb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-zinc-50 ">
              {activeHeadingText}
            </h1>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-3 self-start md:self-auto w-full md:w-auto">
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="md:hidden flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-sm font-bold   text-slate-800 dark:text-zinc-200 hover:bg-slate-50 rounded-none transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-primary" />
              Filters
            </button>

            {/* Desktop Sort Selector */}
            <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-3 py-1.5 h-10 w-full md:w-56 rounded-none">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs font-bold   text-slate-800 dark:text-zinc-200 outline-none cursor-pointer"
              >
                <option value="newest">Newest Arrival</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-2 relative items-start">

          {/* LEFT SIDEBAR: FILTERS (DESKTOP) */}
          <aside className="hidden md:block w-72 flex-shrink-0 sticky top-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-6 space-y-6 rounded-none">

            {/* Header / Clear All */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-sm font-black   text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                Filters by
              </h3>
              {isAnyFilterActive && (
                <button
                  onClick={handleClearFilters}
                  className="text-[10px] font-black   text-primary hover:underline transition-all"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Categories & Subcategories Filter */}
            <div className="space-y-3">
              <h4 className="text-sm  font-bold text-slate-900 dark:text-zinc-50 ">Categories</h4>
              <div className="space-y-1">
                {categories.map((cat) => {
                  const isCatSelected = selectedCategory === cat.id;
                  const isExpanded = !!expandedCategories[cat.id];
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`flex items-center justify-between px-3 py-2 text-xs font-semibold cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors ${isCatSelected
                          ? "bg-primary/5 text-primary border-l-2 border-primary"
                          : "text-slate-700 dark:text-zinc-300"
                          }`}
                      >
                        <span>{cat.name}</span>
                        {cat.subcategories.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpandCategory(cat.id);
                            }}
                            className="p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-none transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>

                      {/* Subcategories (Expanded view) */}
                      {isExpanded && cat.subcategories.length > 0 && (
                        <div className="pl-4 pr-1 py-1 space-y-1 border-l border-slate-100 dark:border-zinc-800 ml-3">
                          {cat.subcategories.map((sub) => {
                            const isSubSelected = selectedSubcategory === sub.id;
                            return (
                              <button
                                key={sub.id}
                                onClick={(e) => handleSelectSubcategory(sub.id, e)}
                                className={`w-full text-left px-3 py-1.5 text-[11px] font-bold   transition-colors hover:text-primary ${isSubSelected
                                  ? "text-primary bg-primary/5 border-r border-primary"
                                  : "text-slate-500 dark:text-zinc-400"
                                  }`}
                              >
                                {sub.name}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
              <h4 className="text-sm  font-bold text-slate-900 dark:text-zinc-50 ">Price Range (৳)</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-1.5 h-9 rounded-none">
                  <span className="text-[10px] font-bold text-slate-400 mr-1.5">Min:</span>
                  <input
                    type="number"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none"
                    placeholder={globalMinPrice.toString()}
                  />
                </div>
                <span className="text-slate-400 text-xs font-bold">—</span>
                <div className="flex-1 flex items-center bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-1.5 h-9 rounded-none">
                  <span className="text-[10px] font-bold text-slate-400 mr-1.5">Max:</span>
                  <input
                    type="number"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none"
                    placeholder={globalMaxPrice.toString()}
                  />
                </div>
              </div>
            </div>

            {/* Brands Filter */}
            {brands.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <h4 className="text-sm  font-bold text-slate-900 dark:text-zinc-50 ">Brands</h4>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {brands.map((brand) => {
                    const isBrandChecked = selectedBrands.includes(brand.id);
                    return (
                      <label
                        key={brand.id}
                        className="flex items-center gap-2.5 px-1 py-1 cursor-pointer group text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100"
                      >
                        <div
                          onClick={() => handleToggleBrand(brand.id)}
                          className={`w-4.5 h-4.5 border flex items-center justify-center transition-colors rounded-none ${isBrandChecked
                            ? "bg-primary border-primary text-white"
                            : "border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 group-hover:border-slate-400"
                            }`}
                        >
                          {isBrandChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-xs font-bold   select-none">
                          {brand.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </aside>

          {/* RIGHT SIDE: PRODUCT GRID */}
          <section className="flex-1 w-full">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product as any} />
                ))}
              </div>
            ) : (
              <div className="py-24 text-center bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex flex-col items-center justify-center p-6 rounded-none">
                <div className="w-16 h-16 bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-600 rounded-full flex items-center justify-center mb-4">
                  <SlidersHorizontal className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-zinc-100 uppercase tracking-wide">
                  No matches found
                </h3>
                <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm max-w-xs font-medium">
                  We couldn't find any products matching your active filter criteria.
                </p>
                {isAnyFilterActive && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-6 px-6 py-2.5 bg-primary text-white font-bold  text-xs rounded-none hover:bg-opacity-90 transition-colors"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* MOBILE FILTER OVERLAY / MODAL */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFilterOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] md:hidden"
            />

            {/* Slide in from left Filter Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed left-0 top-0 h-full w-80 bg-white dark:bg-zinc-900 flex flex-col shadow-2xl z-[101] md:hidden"
            >
              {/* Mobile Filter Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-zinc-800">
                <h3 className="text-sm font-black text-slate-900 dark:text-zinc-50 flex items-center gap-2">
                  <SlidersHorizontal className="w-4.5 h-4.5 text-primary" />
                  Filters by
                </h3>
                <div className="flex items-center gap-3">
                  {isAnyFilterActive && (
                    <button
                      onClick={handleClearFilters}
                      className="text-[10px] font-black   text-primary hover:underline"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-none transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Mobile Filter Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Category Filter */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Categories</h4>
                  <div className="space-y-1">
                    {categories.map((cat) => {
                      const isCatSelected = selectedCategory === cat.id;
                      const isExpanded = !!expandedCategories[cat.id];
                      return (
                        <div key={cat.id} className="space-y-1">
                          <div
                            onClick={() => handleSelectCategory(cat.id)}
                            className={`flex items-center justify-between px-3 py-2 text-xs font-bold   cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors ${isCatSelected
                              ? "bg-primary/5 text-primary border-l-2 border-primary"
                              : "text-slate-700 dark:text-zinc-300"
                              }`}
                          >
                            <span>{cat.name}</span>
                            {cat.subcategories.length > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpandCategory(cat.id);
                                }}
                                className="p-0.5 hover:bg-slate-100 dark:hover:bg-zinc-700 rounded-none transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>

                          {isExpanded && cat.subcategories.length > 0 && (
                            <div className="pl-4 pr-1 py-1 space-y-1 border-l border-slate-100 dark:border-zinc-800 ml-3">
                              {cat.subcategories.map((sub) => {
                                const isSubSelected = selectedSubcategory === sub.id;
                                return (
                                  <button
                                    key={sub.id}
                                    onClick={(e) => {
                                      handleSelectSubcategory(sub.id, e);
                                      setIsMobileFilterOpen(false); // Auto close mobile modal to display filtered results instantly
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-[11px] font-bold   transition-colors hover:text-primary ${isSubSelected
                                      ? "text-primary bg-primary/5 border-r border-primary"
                                      : "text-slate-500 dark:text-zinc-400"
                                      }`}
                                  >
                                    {sub.name}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Price Filter */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Price Range (৳)</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-1.5 h-9 rounded-none">
                      <span className="text-[10px] font-bold text-slate-400 mr-1.5">Min:</span>
                      <input
                        type="number"
                        value={minPriceInput}
                        onChange={(e) => setMinPriceInput(e.target.value)}
                        className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none"
                        placeholder={globalMinPrice.toString()}
                      />
                    </div>
                    <span className="text-slate-400 text-xs font-bold">—</span>
                    <div className="flex-1 flex items-center bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-1.5 h-9 rounded-none">
                      <span className="text-[10px] font-bold text-slate-400 mr-1.5">Max:</span>
                      <input
                        type="number"
                        value={maxPriceInput}
                        onChange={(e) => setMaxPriceInput(e.target.value)}
                        className="w-full bg-transparent border-none text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none"
                        placeholder={globalMaxPrice.toString()}
                      />
                    </div>
                  </div>
                </div>

                {/* Brands Filter */}
                {brands.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Brands</h4>
                    <div className="space-y-1.5">
                      {brands.map((brand) => {
                        const isBrandChecked = selectedBrands.includes(brand.id);
                        return (
                          <label
                            key={brand.id}
                            className="flex items-center gap-2.5 px-1 py-1 cursor-pointer group text-slate-700 dark:text-zinc-300"
                          >
                            <div
                              onClick={() => handleToggleBrand(brand.id)}
                              className={`w-4.5 h-4.5 border flex items-center justify-center transition-colors rounded-none ${isBrandChecked
                                ? "bg-primary border-primary text-white"
                                : "border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                                }`}
                            >
                              {isBrandChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-bold   select-none">
                              {brand.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Filter Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-3 bg-primary text-white font-bold   text-xs rounded-none hover:bg-opacity-90 transition-colors"
                >
                  Apply Filters ({filteredProducts.length})
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
