"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function AdminPagination({ totalPages, currentPage }: { totalPages: number, currentPage: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages === 0) return null;

  const limitVal = searchParams.get("limit");
  const limit = limitVal && ["10", "20", "50", "100"].includes(limitVal) ? limitVal : "10";

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextLimit = e.target.value;
    const params = new URLSearchParams(searchParams);
    params.set("limit", nextLimit);
    params.set("page", "1"); // Reset to page 1
    router.push(`${pathname}?${params.toString()}`);
  };

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
      {/* Mobile view */}
      <div className="flex flex-col gap-3 sm:hidden w-full">
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            {currentPage > 1 ? (
              <Link
                href={createPageURL(currentPage - 1)}
                className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Previous
              </Link>
            ) : (
              <span className="relative inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed">
                Previous
              </span>
            )}
            {currentPage < totalPages ? (
              <Link
                href={createPageURL(currentPage + 1)}
                className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Next
              </Link>
            ) : (
              <span className="relative ml-3 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed">
                Next
              </span>
            )}
          </div>
        )}
        <div className={`flex items-center justify-between ${totalPages > 1 ? 'border-t border-slate-100 pt-3' : ''}`}>
          <p className="text-xs text-slate-500">
            Page <span className="font-semibold text-slate-800">{currentPage}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
          </p>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Show</span>
            <select
              value={limit}
              onChange={handleLimitChange}
              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-xs font-semibold outline-none cursor-pointer text-slate-700"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-slate-700">
            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
          </p>
          <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
            <span className="text-xs text-slate-500 font-medium">Show</span>
            <select
              value={limit}
              onChange={handleLimitChange}
              className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold focus:ring-4 focus:ring-slate-500/10 focus:border-slate-300 outline-none transition-all cursor-pointer text-slate-700"
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>
        {totalPages > 1 && (
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              {currentPage > 1 ? (
                <Link
                  href={createPageURL(currentPage - 1)}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <span className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-300 ring-1 ring-inset ring-slate-200 bg-slate-50 focus:z-20 focus:outline-offset-0 cursor-not-allowed">
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </span>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show max 5 pages, with current page in middle if possible
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Link
                      key={page}
                      href={createPageURL(page)}
                      aria-current={page === currentPage ? "page" : undefined}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${
                        page === currentPage
                          ? "z-10 bg-primary text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                          : "text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </Link>
                  );
                }

                // Render ellipsis
                if (
                  (page === currentPage - 2 && page > 1) ||
                  (page === currentPage + 2 && page < totalPages)
                ) {
                  return (
                    <span
                      key={page}
                      className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0"
                    >
                      ...
                    </span>
                  );
                }

                return null;
              })}

              {currentPage < totalPages ? (
                <Link
                  href={createPageURL(currentPage + 1)}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <span className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-300 ring-1 ring-inset ring-slate-200 bg-slate-50 focus:z-20 focus:outline-offset-0 cursor-not-allowed">
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

