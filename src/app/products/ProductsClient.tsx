"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X, Check, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import Breadcrumb from "@/components/Breadcrumb";
import { fetchProductsAction } from "./actions";

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
  totalCount: number;
  currentPage: number;
  totalPages: number;
  globalMinPrice: number;
  globalMaxPrice: number;
  initialMinPrice?: string;
  initialMaxPrice?: string;
  initialSort?: string;
}

export default function ProductsClient({
  products,
  categories,
  brands,
  initialCategory,
  initialBrand,
  initialSubcategory,
  totalCount,
  currentPage,
  totalPages,
  globalMinPrice,
  globalMaxPrice,
  initialMinPrice = "",
  initialMaxPrice = "",
  initialSort = "newest",
}: ProductsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(() => {
    if (initialCategory) {
      const foundCat = categories.find(
        (c) => c.id === initialCategory || c.name.toLowerCase() === initialCategory.toLowerCase()
      );
      return foundCat ? foundCat.id : initialCategory;
    }
    return null;
  });

  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(() => {
    if (initialSubcategory) {
      const foundSub = categories
        .flatMap((c) => c.subcategories)
        .find((s) => s.id === initialSubcategory || s.name.toLowerCase() === initialSubcategory.toLowerCase());
      return foundSub ? foundSub.id : initialSubcategory;
    }
    return null;
  });

  const [selectedBrands, setSelectedBrands] = useState<string[]>(() => {
    if (initialBrand) {
      const brandsList = initialBrand.split(",");
      return brandsList.map((bParam) => {
        const foundBrand = brands.find(
          (b) => b.id === bParam || b.name.toLowerCase() === bParam.toLowerCase()
        );
        return foundBrand ? foundBrand.id : bParam;
      });
    }
    return [];
  });

  const [minPriceInput, setMinPriceInput] = useState<string>(initialMinPrice);
  const [maxPriceInput, setMaxPriceInput] = useState<string>(initialMaxPrice);
  const [sortBy, setSortBy] = useState<string>(initialSort);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    if (initialCategory) {
      const foundCat = categories.find(
        (c) => c.id === initialCategory || c.name.toLowerCase() === initialCategory.toLowerCase()
      );
      if (foundCat) return { [foundCat.id]: true };
    }
    return {};
  });

  useEffect(() => {
    if (initialCategory) {
      const foundCat = categories.find(
        (c) => c.id === initialCategory || c.name.toLowerCase() === initialCategory.toLowerCase()
      );
      setSelectedCategory(foundCat ? foundCat.id : initialCategory);
      if (foundCat) setExpandedCategories((prev) => ({ ...prev, [foundCat.id]: true }));
    } else {
      setSelectedCategory(null);
    }

    if (initialSubcategory) {
      const foundSub = categories
        .flatMap((c) => c.subcategories)
        .find((s) => s.id === initialSubcategory || s.name.toLowerCase() === initialSubcategory.toLowerCase());
      setSelectedSubcategory(foundSub ? foundSub.id : initialSubcategory);
    } else {
      setSelectedSubcategory(null);
    }

    if (initialBrand) {
      const brandsList = initialBrand.split(",");
      const brandIds = brandsList.map((bParam) => {
        const foundBrand = brands.find(
          (b) => b.id === bParam || b.name.toLowerCase() === bParam.toLowerCase()
        );
        return foundBrand ? foundBrand.id : bParam;
      });
      setSelectedBrands(brandIds);
    } else {
      setSelectedBrands([]);
    }

    setMinPriceInput(initialMinPrice);
    setMaxPriceInput(initialMaxPrice);
    setSortBy(initialSort);
  }, [initialCategory, initialBrand, initialSubcategory, initialMinPrice, initialMaxPrice, initialSort, categories, brands]);

  const updateQueryParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined) params.delete(key);
      else params.set(key, val);
    });
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePriceSubmit = () => {
    updateQueryParams({ minPrice: minPriceInput || undefined, maxPrice: maxPriceInput || undefined, page: undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handlePriceSubmit();
  };

  const handleToggleBrand = (brandId: string) => {
    const updatedBrands = selectedBrands.includes(brandId)
      ? selectedBrands.filter((id) => id !== brandId)
      : [...selectedBrands, brandId];
    setSelectedBrands(updatedBrands);
    const brandParams = updatedBrands.map((bId) => {
      const bObj = brands.find((b) => b.id === bId);
      return bObj ? bObj.name.toLowerCase() : bId;
    });
    updateQueryParams({ brand: brandParams.length > 0 ? brandParams.join(",") : undefined, page: undefined });
  };

  const toggleExpandCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const handleSelectCategory = (categoryId: string | null) => {
    if (selectedCategory === categoryId) {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      updateQueryParams({ category: undefined, subcategory: undefined, page: undefined });
    } else {
      setSelectedCategory(categoryId);
      setSelectedSubcategory(null);
      const catObj = categories.find((c) => c.id === categoryId);
      updateQueryParams({ category: catObj ? catObj.name.toLowerCase() : undefined, subcategory: undefined, page: undefined });
      if (categoryId) setExpandedCategories((prev) => ({ ...prev, [categoryId]: true }));
    }
  };

  const handleSelectSubcategory = (subcategoryId: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedSubcategory === subcategoryId) {
      setSelectedSubcategory(null);
      updateQueryParams({ subcategory: undefined, page: undefined });
    } else {
      setSelectedSubcategory(subcategoryId);
      const subObj = categories.flatMap((c) => c.subcategories).find((s) => s.id === subcategoryId);
      updateQueryParams({ subcategory: subObj ? subObj.name.toLowerCase() : undefined, page: undefined });
    }
  };

  const handleClearFilters = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedBrands([]);
    setMinPriceInput("");
    setMaxPriceInput("");
    setSortBy("newest");
    router.replace(pathname, { scroll: false });
  };

  const isAnyFilterActive = useMemo(() => {
    return (
      selectedCategory !== null ||
      selectedSubcategory !== null ||
      selectedBrands.length > 0 ||
      initialMinPrice !== "" ||
      initialMaxPrice !== "" ||
      initialSort !== "newest"
    );
  }, [selectedCategory, selectedSubcategory, selectedBrands, initialMinPrice, initialMaxPrice, initialSort]);

  const [visibleProducts, setVisibleProducts] = useState<Product[]>(products);
  const [loadedPage, setLoadedPage] = useState(currentPage);
  const [hasMore, setHasMore] = useState(currentPage < totalPages);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleProducts(products);
    setLoadedPage(currentPage);
    setHasMore(currentPage < totalPages);
    setLoadingMore(false);
  }, [products, currentPage, totalPages]);

  const loadMoreProducts = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = loadedPage + 1;
      const res = await fetchProductsAction({
        category: initialCategory,
        subcategory: initialSubcategory,
        brand: initialBrand,
        minPrice: initialMinPrice,
        maxPrice: initialMaxPrice,
        sort: sortBy,
        page: nextPage,
      });
      if (res.products && res.products.length > 0) {
        setVisibleProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newProducts = res.products.filter((p: any) => !existingIds.has(p.id)) as Product[];
          return [...prev, ...newProducts];
        });
        setLoadedPage(nextPage);
        setHasMore(nextPage < res.totalPages);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreProducts(); },
      { rootMargin: "200px" }
    );
    const currentSentinel = sentinelRef.current;
    if (currentSentinel) observer.observe(currentSentinel);
    return () => { if (currentSentinel) observer.unobserve(currentSentinel); };
  }, [hasMore, loadedPage, loadingMore, initialCategory, initialSubcategory, initialBrand, initialMinPrice, initialMaxPrice, sortBy]);

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

  // ─── Shared Filter Panel Content ────────────────────────────────────────────
  const FilterContent = ({ onClose }: { onClose?: () => void }) => (
    <div className="space-y-5">

      {/* Categories */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Category</p>
        <div className="space-y-0.5">
          {categories.map((cat) => {
            const isCatSelected = selectedCategory === cat.id;
            const isExpanded = !!expandedCategories[cat.id];
            return (
              <div key={cat.id}>
                <button
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`w-full flex items-center justify-between py-1.5 px-2 rounded-md text-sm transition-colors text-left ${
                    isCatSelected
                      ? "text-primary font-semibold bg-primary/5"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-normal"
                  }`}
                >
                  <span>{cat.name}</span>
                  {cat.subcategories.length > 0 && (
                    <span
                      onClick={(e) => { e.stopPropagation(); toggleExpandCategory(cat.id); }}
                      className="p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  )}
                </button>

                {isExpanded && cat.subcategories.length > 0 && (
                  <div className="ml-3 mt-0.5 mb-1 pl-3 border-l border-slate-100 space-y-0.5">
                    {cat.subcategories.map((sub) => {
                      const isSubSelected = selectedSubcategory === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={(e) => {
                            handleSelectSubcategory(sub.id, e);
                            onClose?.();
                          }}
                          className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${
                            isSubSelected
                              ? "text-primary font-semibold"
                              : "text-slate-500 hover:text-slate-800 font-normal"
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

      {/* Price Range */}
      <div className="pt-4 border-t border-slate-100">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Price (৳)</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handlePriceSubmit}
            placeholder={`${globalMinPrice}`}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-700 placeholder-slate-300 outline-none focus:border-slate-400 transition-colors bg-white"
          />
          <span className="text-slate-300 text-xs flex-shrink-0">–</span>
          <input
            type="number"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handlePriceSubmit}
            placeholder={`${globalMaxPrice}`}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-700 placeholder-slate-300 outline-none focus:border-slate-400 transition-colors bg-white"
          />
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Brand</p>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {brands.map((brand) => {
              const isChecked = selectedBrands.includes(brand.id);
              return (
                <button
                  key={brand.id}
                  onClick={() => handleToggleBrand(brand.id)}
                  className="w-full flex items-center gap-2.5 py-1.5 px-1 group text-left"
                >
                  <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                    isChecked
                      ? "bg-primary border-primary"
                      : "border-slate-300 bg-white group-hover:border-slate-400"
                  }`}>
                    {isChecked && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </span>
                  <span className={`text-xs transition-colors ${
                    isChecked ? "text-slate-800 font-medium" : "text-slate-500 group-hover:text-slate-700"
                  }`}>
                    {brand.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full bg-slate-50 dark:bg-zinc-950 py-6 border-t border-slate-200 dark:border-zinc-800">
      <div className="container mx-auto px-2 md:px-6">

        {/* Toolbar row */}
        <div className="mb-6 flex items-center justify-between gap-3 pb-5 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <Breadcrumb items={[
              { label: activeHeadingText, href: undefined }
            ]} />
            <p className="text-xs text-slate-400 mt-0.5">{totalCount} products</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile filter button */}
            <button
              onClick={() => setIsMobileFilterOpen(true)}
              className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:border-slate-300 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
              {isAnyFilterActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>

            {/* Sort */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-slate-300 transition-colors">
              <span className="text-[10px] text-slate-400 hidden sm:block">Sort</span>
              <select
                value={sortBy}
                onChange={(e) => {
                  const newSort = e.target.value;
                  setSortBy(newSort);
                  updateQueryParams({ sort: newSort, page: undefined });
                }}
                className="bg-transparent border-none text-xs font-medium text-slate-700 outline-none cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-5 relative items-start">

          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-56 flex-shrink-0 sticky top-24">

            {/* Filter header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                Filters
              </span>
              {isAnyFilterActive && (
                <button
                  onClick={handleClearFilters}
                  className="text-[11px] text-slate-400 hover:text-primary transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <FilterContent />
          </aside>

          {/* Product Grid */}
          <section className="flex-1 w-full min-w-0">
            {visibleProducts.length > 0 ? (
              <div>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
                  {visibleProducts.map((product) => (
                    <ProductCard key={product.id} product={product as any} />
                  ))}
                </div>

                {hasMore && (
                  <div ref={sentinelRef} className="mt-12 flex justify-center py-6">
                    <div className="flex items-center gap-2 text-slate-400">
                      <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                      <span className="text-xs text-slate-400">Loading more...</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <SlidersHorizontal className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700">No products found</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting or clearing your filters</p>
                {isAnyFilterActive && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-5 px-5 py-2 bg-primary text-white text-xs font-medium rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileFilterOpen(false)}
              className="fixed inset-0 bg-black/40 z-[100] md:hidden"
            />

            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed left-0 top-0 h-full w-72 bg-white flex flex-col shadow-xl z-[101] md:hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">Filters</span>
                <div className="flex items-center gap-3">
                  {isAnyFilterActive && (
                    <button onClick={handleClearFilters} className="text-xs text-slate-400 hover:text-primary transition-colors">
                      Clear all
                    </button>
                  )}
                  <button onClick={() => setIsMobileFilterOpen(false)} className="p-1 rounded-md hover:bg-slate-100 transition-colors">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <FilterContent onClose={() => setIsMobileFilterOpen(false)} />
              </div>

              {/* Drawer Footer */}
              <div className="px-5 py-4 border-t border-slate-100">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  Show {totalCount} results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
