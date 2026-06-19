import { Card, CardContent } from '../ui/card';
import { 
  BarChart3, 
  CalendarDays, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';

export default function PickupStatsCards({ stats, activeStatus = '', onStatusChange }) {
  // Defensive fallbacks to prevent crashes if stats object is missing fields
  const data = {
    total: stats?.total || 0,
    scheduled: stats?.scheduled || 0,
    loading: stats?.loading || 0,
    loaded: stats?.loaded || 0,
    verified: stats?.verified || 0,
    rescheduled: stats?.rescheduled || 0,
  };

  const handleStatusClick = (status) => {
    if (onStatusChange) {
      onStatusChange(status);
    }
  };

  const renderCard = (status, title, value, icon, defaultClasses, activeClasses) => {
    const isActive = activeStatus === status;
    return (
      <button
        type="button"
        onClick={() => handleStatusClick(status)}
        className={`w-full rounded-xl border p-0 transition-all duration-150 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${isActive ? activeClasses : defaultClasses}`}
      >
        <Card className="border-0 bg-transparent shadow-none rounded-none">
          <CardContent className="pt-5 pb-4 flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold tracking-wide uppercase">{title}</p>
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            </div>
            <div className="p-2 rounded-lg">
              {icon}
            </div>
          </CardContent>
        </Card>
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
      {renderCard(
        '',
        'Total Pickups',
        data.total,
        <div className="bg-slate-100 rounded-lg text-slate-600 p-2">
          <BarChart3 className="w-5 h-5" />
        </div>,
        'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-900',
        'border-slate-900 bg-slate-100 text-slate-900'
      )}

      {renderCard(
        'scheduled',
        'Scheduled',
        data.scheduled,
        <div className="bg-slate-200/60 rounded-lg text-slate-600 p-2">
          <CalendarDays className="w-5 h-5" />
        </div>,
        'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100 text-slate-800',
        'border-slate-900 bg-slate-100 text-slate-800'
      )}

      {renderCard(
        'loading_started',
        'Loading',
        data.loading,
        <div className="bg-amber-100/80 rounded-lg text-amber-600 p-2">
          <Loader2 className="w-5 h-5 animate-spin duration-1000" />
        </div>,
        'border-slate-200 bg-amber-50/40 hover:border-amber-400 hover:bg-amber-100 text-amber-800',
        'border-amber-600 bg-amber-100 text-amber-800'
      )}

      {renderCard(
        'loaded',
        'Loaded',
        data.loaded,
        <div className="bg-emerald-100/80 rounded-lg text-emerald-600 p-2">
          <CheckCircle2 className="w-5 h-5" />
        </div>,
        'border-slate-200 bg-emerald-50/40 hover:border-emerald-400 hover:bg-emerald-100 text-emerald-800',
        'border-emerald-600 bg-emerald-100 text-emerald-800'
      )}

      {renderCard(
        'verified',
        'Verified',
        data.verified,
        <div className="bg-blue-100/80 rounded-lg text-blue-600 p-2">
          <ShieldCheck className="w-5 h-5" />
        </div>,
        'border-slate-200 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-100 text-blue-800',
        'border-blue-600 bg-blue-100 text-blue-800'
      )}

      {renderCard(
        'rescheduled',
        'Rescheduled',
        data.rescheduled,
        <div className="bg-orange-100/80 rounded-lg text-orange-600 p-2">
          <RefreshCw className="w-4 h-4" />
        </div>,
        'border-slate-200 bg-orange-50/40 hover:border-orange-400 hover:bg-orange-100 text-orange-800',
        'border-orange-600 bg-orange-100 text-orange-800'
      )}
    </div>
  );
}