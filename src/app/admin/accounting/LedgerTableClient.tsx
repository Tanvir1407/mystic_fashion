"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function LedgerTableClient({ 
  transactions, 
  total, 
  currentPage, 
  limit 
}: { 
  transactions: any[], 
  total: number, 
  currentPage: number, 
  limit: number 
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
        <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 font-medium">Date</th>
              <th className="px-6 py-4 font-medium">Description</th>
              <th className="px-6 py-4 font-medium">Account</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                    {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-gray-900 font-medium">{tx.description}</p>
                    {tx.referenceId && (
                      <span className="text-xs text-gray-500 mt-1 inline-block">Ref: {tx.referenceId}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {tx.account?.name}
                    <span className="block text-[10px] uppercase tracking-wider text-gray-400 mt-0.5">{tx.account?.type}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      tx.type === 'CREDIT' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900 whitespace-nowrap">
                    ৳ {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-white">
          <span className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">{(currentPage - 1) * limit + 1}</span> to <span className="font-medium text-gray-900">{Math.min(currentPage * limit, total)}</span> of <span className="font-medium text-gray-900">{total}</span> results
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
