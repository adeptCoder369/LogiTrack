import { useAuth } from '../lib/auth';
import { AlertTriangle, CreditCard } from 'lucide-react';

export const BillingBanner = () => {
  const { tenant, isPastDue, isSuspended, user } = useAuth();
  if (user?.is_master_admin) return null;
  if (isSuspended) {
    return (
      <div className="bg-rose-600 text-white px-4 py-3 text-center text-sm font-medium flex items-center justify-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Your workspace is suspended — subscription canceled. Kindly contact your admin or Platform to reactivate.
      </div>
    );
  }
  if (isPastDue) {
    return (
      <div className="bg-amber-500 text-white px-4 py-3 text-center text-sm font-medium flex items-center justify-center gap-2">
        <CreditCard className="w-4 h-4" />
        Subscription past due — writes are blocked. Kindly contact your admin to update payment. You can still view data.
      </div>
    );
  }
  return null;
};
