import { getAccounts, getFinancialSummary } from "./actions";
import AccountingDashboardClient from "./AccountingDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accounting ERP & Financial Suite | Admin",
};

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: { startDate?: string; endDate?: string };
}) {
  const [accounts, summary] = await Promise.all([
    getAccounts(),
    getFinancialSummary(searchParams),
  ]);

  return (
    <AccountingDashboardClient
      accounts={accounts}
      initialSummary={summary}
    />
  );
}

