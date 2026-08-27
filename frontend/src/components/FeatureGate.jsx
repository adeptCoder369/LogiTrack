import { useAuth } from '../lib/auth';
import { Lock } from 'lucide-react';

const normalize = (k) => (k || '').toLowerCase().replace(/-/g, '_');

export const useFeatureFlag = (key) => {
  const { tenant, loading, user } = useAuth();
  if (loading) return { enabled: true, loading: true };
  if (user?.is_master_admin) return { enabled: true, loading: false };
  if (!key) return { enabled: true, loading: false };
  const norm = normalize(key);
  const flags = tenant?.feature_flags || {};
  // whitelist: only enabled if explicitly true; master already bypassed
  // for backward compat, if tenant has no flags at all (legacy), treat as enabled
  const hasAnyFlags = Object.keys(flags).length > 0;
  if (!hasAnyFlags) return { enabled: true, loading: false };
  const enabled = flags[norm] === true || flags[key] === true;
  return { enabled, loading: false, flags };
};

export const FeatureGate = ({ feature, children, title, message }) => {
  const { enabled, loading } = useFeatureFlag(feature);
  const { isPastDue, isSuspended, user } = useAuth();
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-slate-400 text-sm">Loading...</div>
      </div>
    );
  }
  // billing past_due soft gate: blur the 4 feature pages even if flag is technically on
  if (isPastDue && !user?.is_master_admin && ['invoices','stock_transfers','leads','firms'].includes((feature||'').toLowerCase().replace(/-/g,'_'))) {
    return (
      <div className="relative min-h-[calc(100vh-8rem)]">
        <div className="blur-[2px] pointer-events-none select-none opacity-40 grayscale-[0.15]">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-white/60 backdrop-blur-[2px]">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-amber-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              Subscription past due
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your subscription is past due — writes are blocked. You can still view data. Kindly contact your admin to update payment.
            </p>
            <p className="text-xs text-slate-400">
              Feature: <code className="px-1.5 py-0.5 bg-amber-50 rounded font-mono border border-amber-100">{feature}</code>
            </p>
          </div>
        </div>
      </div>
    );
  }
  if (enabled) return children;
  return (
    <div className="relative min-h-[calc(100vh-8rem)]">
      <div className="blur-[2px] pointer-events-none select-none opacity-40 grayscale-[0.15]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-6 bg-white/55 backdrop-blur-[2px]">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto bg-amber-50 border border-amber-100 text-amber-600 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
            {title || 'Feature not enabled'}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            {message || 'This feature is not enabled for your workspace. Kindly contact your admin to request access.'}
          </p>
          <p className="text-xs text-slate-400">
            Feature: <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono border">{feature}</code>
          </p>
        </div>
      </div>
    </div>
  );
};
