"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function AdminPagination({ totalPages, currentPage }: { totalPages: number, currentPage: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const createPageURL = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-b-lg">
      <div className="flex flex-1 justify-between sm:hidden">
        {currentPage > 1 ? (
          <Link
            href={createPageURL(currentPage - 1)}
            className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
            className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Next
          </Link>
        ) : (
          <span className="relative ml-3 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400 cursor-not-allowed">
            Next
          </span>
        )}
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-700">
            Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
          </p>
        </div>
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
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${page === currentPage
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
      </div>
    </div>
  );
}
