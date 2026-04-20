import { getAccounts, getFinancialSummary, getLedger } from "./actions";
import LedgerTableClient from "./LedgerTableClient";
import AccountingModalsClient from "./AccountingModalsClient";

export const metadata = {
  title: "Accounting Dashboard | Admin",
};

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: { startDate?: string; endDate?: string; page?: string };
}) {
  const accounts = await getAccounts();
  const summary = await getFinancialSummary(searchParams);
  
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const limit = 15;
  const { transactions, total } = await getLedger(undefined, searchParams, page, limit);

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Accounting Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your income, expenses, and track financial performance.</p>
        </div>
        <div className="flex items-center gap-4">
          <form method="GET" className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
            <input
              type="date"
              name="startDate"
              defaultValue={searchParams.startDate}
              className="text-sm px-2 py-1.5 focus:outline-none bg-transparent"
              title="Start Date"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              name="endDate"
              defaultValue={searchParams.endDate}
              className="text-sm px-2 py-1.5 focus:outline-none bg-transparent"
              title="End Date"
            />
            <button type="submit" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded-md transition-colors">
              Filter
            </button>
            {(searchParams.startDate || searchParams.endDate) && (
              <a href="/admin/accounting" className="px-3 py-1.5 text-red-600 hover:bg-red-50 text-sm font-medium rounded-md transition-colors">
                Clear
              </a>
            )}
          </form>
          <AccountingModalsClient accounts={accounts} />
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-green-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-16 h-16 bg-green-50 rounded-bl-full flex items-start justify-end p-3">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <div className="text-sm font-medium text-gray-500 mb-1">Total Income</div>
          <div className="text-3xl font-bold text-gray-900">৳ {summary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-16 h-16 bg-red-50 rounded-bl-full flex items-start justify-end p-3">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
          </div>
          <div className="text-sm font-medium text-gray-500 mb-1">Total Expense</div>
          <div className="text-3xl font-bold text-gray-900">৳ {summary.totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-black p-6 rounded-xl shadow-md text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-12 -mb-12"></div>
          <div className="relative z-10">
            <div className="text-sm font-medium text-gray-300 mb-1">Net Balance (Profit/Loss)</div>
            <div className="text-3xl font-bold flex items-center">
              {summary.netProfit >= 0 ? '+' : '-'} ৳ {Math.abs(summary.netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="">
          <LedgerTableClient 
            transactions={transactions} 
            total={total} 
            currentPage={page} 
            limit={limit} 
          />
        </div>
      </div>
    </div>
  );
}
