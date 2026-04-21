import { getCoupons } from "./actions";
import { CouponList } from "./CouponList";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  const coupons = await getCoupons();

  return (
    <div>
      <CouponList initialCoupons={coupons} />
    </div>
  );
}
