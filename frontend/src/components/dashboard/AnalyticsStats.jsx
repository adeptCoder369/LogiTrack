import { useNavigate } from 'react-router-dom';
// import { PageLayout } from '../components/layout/PageLayout';
import { Card,  } from '../ui/card';
import { Button } from '../ui/button';
// Import missing icons
import {

  Package,
  Building2,
  Users,
  Truck,
  Container,
  Warehouse,

} from 'lucide-react';
export const AnalyticsStats = ({ analytics, rows }) => {
  const navigate = useNavigate();
  return (
    <>
      <div className="overflow-x-auto min-w-0 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-5">
          <Card
            className="group p-5 hover:shadow-lg hover:border-slate-300 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer bg-gradient-to-br from-slate-50/60 via-white to-white border border-slate-100"
            onClick={() => navigate('/companies')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Companies</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {analytics?.counts?.companies || 0}
                </p>
              </div>
              <div className="w-11 h-11 shrink-0 bg-slate-50/80 text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-slate-500 group-hover:to-slate-700 group-hover:text-white transition-all duration-300 shadow-sm border border-slate-100/50">
                <Building2 className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
          </Card>

          <Card
            className="group p-5 hover:shadow-lg hover:border-indigo-200 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer bg-gradient-to-br from-indigo-50/40 via-white to-white border border-slate-100"
            onClick={() => navigate('/user-management')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Users</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {analytics?.counts?.users || 0}
                </p>
              </div>
              <div className="w-11 h-11 shrink-0 bg-indigo-50/80 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-indigo-700 group-hover:text-white transition-all duration-300 shadow-sm border border-indigo-100/50">
                <Users className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
          </Card>

          <Card
            className="group p-5 hover:shadow-lg hover:border-teal-200 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer bg-gradient-to-br from-teal-50/40 via-white to-white border border-slate-100"
            onClick={() => navigate('/transporters')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Transporters</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {analytics?.counts?.transporters || 0}
                </p>
              </div>
              <div className="w-11 h-11 shrink-0 bg-teal-50/80 text-teal-600 rounded-xl flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-teal-500 group-hover:to-teal-700 group-hover:text-white transition-all duration-300 shadow-sm border border-teal-100/50">
                <Truck className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
          </Card>

          <Card
            className="group p-5 hover:shadow-lg hover:border-cyan-200 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer bg-gradient-to-br from-cyan-50/40 via-white to-white border border-slate-100"
            onClick={() => navigate('/trucks')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Trucks</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {analytics?.counts?.trucks || 0}
                </p>
              </div>
              <div className="w-11 h-11 shrink-0 bg-cyan-50/80 text-cyan-600 rounded-xl flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-cyan-500 group-hover:to-cyan-700 group-hover:text-white transition-all duration-300 shadow-sm border border-cyan-100/50">
                <Container className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
          </Card>

          <Card
            className="group p-5 hover:shadow-lg hover:border-pink-200 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer bg-gradient-to-br from-pink-50/30 via-white to-white border border-slate-100"
            onClick={() => navigate('/products')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Products</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {analytics?.counts?.products || 0}
                </p>
              </div>
              <div className="w-11 h-11 shrink-0 bg-pink-50/80 text-pink-600 rounded-xl flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-pink-500 group-hover:to-pink-700 group-hover:text-white transition-all duration-300 shadow-sm border border-pink-100/50">
                <Package className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
          </Card>

          <Card
            className="group p-5 hover:shadow-lg hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer bg-gradient-to-br from-emerald-50/30 via-white to-white border border-slate-100"
            onClick={() => navigate('/depots')}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-1">Depots</p>
                <p className="text-3xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {analytics?.counts?.depots || 0}
                </p>
              </div>
              <div className="w-11 h-11 shrink-0 bg-emerald-50/80 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-emerald-700 group-hover:text-white transition-all duration-300 shadow-sm border border-emerald-100/50">
                <Warehouse className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
              </div>
            </div>
          </Card>
        </div>
      </div>


    </>
  );
}