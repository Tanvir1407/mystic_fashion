import React from 'react';

export default function ProductDetailLoading() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-pulse">
      {/* Header Section Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-5 h-5 bg-slate-200 rounded"></div>
            <div className="h-8 bg-slate-200 rounded w-64"></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <div className="h-5 bg-slate-200 rounded w-16"></div>
            <div className="h-5 bg-slate-200 rounded w-20"></div>
            <div className="h-5 bg-slate-200 rounded w-24"></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 bg-slate-200 rounded w-28"></div>
          <div className="h-9 bg-slate-200 rounded w-32"></div>
        </div>
      </div>

      {/* Analytics Dashboard Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 bg-slate-200 rounded w-24"></div>
              <div className="w-4 h-4 bg-slate-200 rounded"></div>
            </div>
            <div className="h-8 bg-slate-200 rounded w-16"></div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual & Core Info Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <div className="h-5 bg-slate-200 rounded w-32 mb-4 border-b border-slate-100 pb-2"></div>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image Gallery Skeleton */}
              <div className="w-full md:w-1/3 space-y-3">
                <div className="aspect-square w-full bg-slate-200 border border-slate-100"></div>
                <div className="grid grid-cols-4 gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="aspect-square w-full bg-slate-200 border border-slate-100"></div>
                  ))}
                </div>
              </div>

              {/* Core Info Skeleton */}
              <div className="w-full md:w-2/3 space-y-4">
                <div>
                  <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-full"></div>
                    <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-200 rounded w-4/6"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div>
                    <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                    <div className="h-7 bg-slate-200 rounded w-24"></div>
                  </div>
                  <div>
                    <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                    <div className="h-7 bg-slate-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sales & Movement History Skeleton */}
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <div className="h-5 bg-slate-200 rounded w-48 mb-4 border-b border-slate-100 pb-2"></div>
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar: Inventory & Variants Skeleton */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <div className="h-5 bg-slate-200 rounded w-32"></div>
              <div className="h-4 bg-slate-200 rounded w-24"></div>
            </div>

            <div className="border border-slate-200">
              <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-between">
                <div className="h-4 bg-slate-200 rounded w-12"></div>
                <div className="h-4 bg-slate-200 rounded w-12"></div>
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-3 flex justify-between border-b border-slate-100 last:border-0">
                  <div className="h-4 bg-slate-200 rounded w-16"></div>
                  <div className="h-4 bg-slate-200 rounded w-8"></div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
              <div className="h-4 bg-slate-200 rounded w-32"></div>
              <div className="h-4 bg-slate-200 rounded w-16"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
