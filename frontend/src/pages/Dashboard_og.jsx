import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { analyticsApi, liftingsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Building2,
  Users,
  Truck,
  Container,
  Package,
  Warehouse,
  ClipboardList,
  PackageCheck,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  CircleDot,
  ArrowDownToLine,
  ArrowUpFromLine,
  Factory,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [pendingLiftings, setPendingLiftings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompanyDeliveries, setExpandedCompanyDeliveries] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, liftingsRes] = await Promise.all([
        analyticsApi.getDashboard(),
        liftingsApi.getAll({ unloading_status: 'Pending' })
      ]);
      setAnalytics(analyticsRes.data);
      setPendingLiftings(liftingsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToLiftingsWithFilter = (filterType) => {
    // Navigate to liftings page with query params for filtering
    navigate(`/liftings?unloading_point_type=${filterType}`);
  };

  if (loading) {
    return (
      <PageLayout title="Dashboard" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-400">Loading dashboard...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`Welcome, ${user?.name}`} subtitle={`Role: ${user?.role}`}>
      
      {/* Management Dashboard */}
      {hasRole('Management') && (
        <>
          {/* Main KPI Cards - 4 cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            
            {/* Delivery Orders Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-orange-500 group"
              onClick={() => navigate('/delivery-orders')}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Delivery Orders</p>
                    <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                      {analytics?.counts.delivery_orders || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {/* Open DOs Breakup */}
                <div className="border-t pt-2 mt-2">
                  <p className="text-[10px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                    <CircleDot className="w-3 h-3 text-orange-500" />
                    Open / In Progress
                  </p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {analytics?.open_delivery_orders?.length > 0 ? (
                      analytics.open_delivery_orders.slice(0, 3).map((order, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] bg-orange-50 rounded px-2 py-1">
                          <span className="font-mono font-medium text-orange-700">{order.do_order_no}</span>
                          <span className="text-gray-600 truncate max-w-[80px]">
                            {order.product_name} • <span className="font-semibold">{order.remaining_quantity_mt?.toFixed(1)}</span>
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">No open orders</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center text-orange-600 text-xs mt-2 group-hover:translate-x-1 transition-transform">
                  View All <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>

            {/* Total Liftings Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 group"
              onClick={() => navigate('/liftings')}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Total Liftings</p>
                    <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                      {analytics?.counts.liftings || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                    <PackageCheck className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {/* Primary & Secondary Breakup */}
                <div className="border-t pt-2 mt-2 space-y-2">
                  {/* Primary: Company → */}
                  <div>
                    <p className="text-[10px] font-semibold text-blue-600 mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Primary ({analytics?.primary_summary?.total_count || 0})
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div className="bg-blue-50 rounded px-1.5 py-1">
                        <span className="text-gray-500">Co.→Depot: </span>
                        <span className="font-semibold text-blue-700">{analytics?.primary_summary?.to_depot_qty || 0} MT</span>
                      </div>
                      <div className="bg-green-50 rounded px-1.5 py-1">
                        <span className="text-gray-500">Co.→Client: </span>
                        <span className="font-semibold text-green-700">{analytics?.primary_summary?.to_client_qty || 0} MT</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Secondary: Depot → */}
                  <div>
                    <p className="text-[10px] font-semibold text-purple-600 mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Secondary ({analytics?.secondary_summary?.total_count || 0})
                    </p>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div className="bg-purple-50 rounded px-1.5 py-1">
                        <span className="text-gray-500">Depot→Client: </span>
                        <span className="font-semibold text-purple-700">{analytics?.secondary_summary?.to_company_qty || 0} MT</span>
                      </div>
                      <div className="bg-indigo-50 rounded px-1.5 py-1">
                        <span className="text-gray-500">Depot→Depot: </span>
                        <span className="font-semibold text-indigo-700">{analytics?.secondary_summary?.to_depot_qty || 0} MT</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center text-blue-600 text-xs mt-2 group-hover:translate-x-1 transition-transform">
                  View All <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>

            {/* Pending Verification Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-amber-500 group"
              onClick={() => navigate('/verification')}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Pending Verification</p>
                    <p className="text-3xl font-bold text-amber-600" style={{ fontFamily: 'Manrope' }}>
                      {analytics?.liftings_by_status.pending || 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {/* Pending by Product Breakup */}
                <div className="border-t pt-2 mt-2">
                  <p className="text-[10px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    Product-wise Qty
                  </p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {analytics?.pending_by_product?.length > 0 ? (
                      analytics.pending_by_product.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] bg-amber-50 rounded px-2 py-1">
                          <span className="text-gray-700 truncate max-w-[80px]">{item.product_name}</span>
                          <span className="font-semibold text-amber-700">{item.total_qty?.toFixed(1)} MT</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-green-600 italic flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> All verified!
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center text-amber-600 text-xs mt-2 group-hover:translate-x-1 transition-transform">
                  Verify Now <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>

            {/* Client Deliveries Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-l-4 border-l-emerald-500 group"
              onClick={() => navigateToLiftingsWithFilter('Company')}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Sent to Clients</p>
                    <p className="text-3xl font-bold text-emerald-600" style={{ fontFamily: 'Manrope' }}>
                      {analytics?.company_deliveries_total?.total_qty?.toFixed(1) || 0}
                      <span className="text-sm font-normal text-gray-400 ml-1">MT</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Factory className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {/* Client Deliveries by Product */}
                <div className="border-t pt-2 mt-2">
                  <p className="text-[10px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">
                    <ArrowDownToLine className="w-3 h-3 text-emerald-500" />
                    Product-wise ({analytics?.company_deliveries_total?.total_count || 0} liftings)
                  </p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {analytics?.company_deliveries?.length > 0 ? (
                      analytics.company_deliveries.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[10px] bg-emerald-50 rounded px-2 py-1">
                          <span className="text-gray-700 truncate max-w-[80px]">{item.product_name}</span>
                          <div className="text-right">
                            <span className="font-semibold text-emerald-700">{item.total_qty?.toFixed(1)} MT</span>
                            <span className="text-gray-400 ml-1">({item.count})</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-gray-400 italic">No client deliveries</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center text-emerald-600 text-xs mt-2 group-hover:translate-x-1 transition-transform">
                  View Ledger <ChevronRight className="w-3 h-3 ml-1" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company Deliveries Detailed Ledger - Expandable */}
          {analytics?.company_deliveries?.length > 0 && (
            <Card className="mb-6">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                onClick={() => setExpandedCompanyDeliveries(!expandedCompanyDeliveries)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Factory className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Company Deliveries Ledger</h3>
                    <p className="text-xs text-gray-500">
                      Total: {analytics.company_deliveries_total?.total_qty?.toFixed(2)} MT • 
                      {analytics.company_deliveries_total?.verified_count} verified, {analytics.company_deliveries_total?.pending_count} pending
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToLiftingsWithFilter('Company');
                    }}
                  >
                    Open in Liftings
                  </Button>
                  {expandedCompanyDeliveries ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              
              {expandedCompanyDeliveries && (
                <CardContent className="pt-0 border-t">
                  <div className="space-y-4">
                    {analytics.company_deliveries.map((product, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            <Package className="w-4 h-4 text-orange-500" />
                            {product.product_name}
                          </h4>
                          <div className="text-sm">
                            <span className="font-semibold text-emerald-600">{product.total_qty?.toFixed(2)} MT</span>
                            <span className="text-gray-400 ml-2">({product.count} liftings)</span>
                          </div>
                        </div>
                        
                        {/* Ledger Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="text-left p-2 font-medium">Lifting #</th>
                                <th className="text-left p-2 font-medium">Company</th>
                                <th className="text-left p-2 font-medium">Type</th>
                                <th className="text-right p-2 font-medium">Qty (MT)</th>
                                <th className="text-left p-2 font-medium">Vehicle</th>
                                <th className="text-left p-2 font-medium">Date</th>
                                <th className="text-center p-2 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {product.liftings?.slice(0, 10).map((lifting, lIdx) => (
                                <tr key={lIdx} className="hover:bg-gray-50">
                                  <td className="p-2 font-mono text-blue-600">{lifting.lifting_no}</td>
                                  <td className="p-2 truncate max-w-[100px]">{lifting.company_name}</td>
                                  <td className="p-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                      lifting.lifting_type === 'Primary' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : 'bg-purple-100 text-purple-700'
                                    }`}>
                                      {lifting.lifting_type}
                                    </span>
                                  </td>
                                  <td className="p-2 text-right font-medium">{lifting.quantity?.toFixed(2)}</td>
                                  <td className="p-2 font-mono text-gray-600">{lifting.vehicle_number || '-'}</td>
                                  <td className="p-2 text-gray-500">{lifting.date_of_loading || '-'}</td>
                                  <td className="p-2 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                      lifting.status === 'Verified' 
                                        ? 'bg-green-100 text-green-700' 
                                        : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {lifting.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {product.liftings?.length > 10 && (
                            <p className="text-xs text-gray-400 text-center py-2">
                              +{product.liftings.length - 10} more liftings...
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/companies')}>
              <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-slate-500 to-slate-700 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{analytics?.counts.companies || 0}</p>
              <p className="text-xs text-gray-500">Companies</p>
            </Card>
            <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/user-management')}>
              <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{analytics?.counts.users || 0}</p>
              <p className="text-xs text-gray-500">Users</p>
            </Card>
            <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/transporters')}>
              <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-teal-500 to-teal-700 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{analytics?.counts.transporters || 0}</p>
              <p className="text-xs text-gray-500">Transporters</p>
            </Card>
            <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/trucks')}>
              <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-lg flex items-center justify-center">
                <Container className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{analytics?.counts.trucks || 0}</p>
              <p className="text-xs text-gray-500">Trucks</p>
            </Card>
            <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/products')}>
              <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-pink-500 to-pink-700 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{analytics?.counts.products || 0}</p>
              <p className="text-xs text-gray-500">Products</p>
            </Card>
            <Card className="text-center p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/depots')}>
              <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center">
                <Warehouse className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{analytics?.counts.depots || 0}</p>
              <p className="text-xs text-gray-500">Depots</p>
            </Card>
          </div>
        </>
      )}

      {/* Loader Dashboard */}
      {hasRole('Loader') && !hasRole('Management') && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Open Orders</p>
                    <p className="text-3xl font-bold">{analytics?.orders_by_status.open || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Ready for liftings</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => navigate('/delivery-orders')}
                >
                  View Orders <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">My Liftings</p>
                    <p className="text-3xl font-bold">{analytics?.counts.liftings || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Total created</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                    <PackageCheck className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4 bg-orange-500 hover:bg-orange-600" 
                  onClick={() => navigate('/liftings')}
                >
                  Create Lifting <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Available Trucks</p>
                    <p className="text-3xl font-bold">{analytics?.counts.trucks || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-slate-600 rounded-xl flex items-center justify-center">
                    <Container className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => navigate('/trucks')}
                >
                  View Trucks <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card 
              className="cursor-pointer border-l-4 border-l-cyan-500 hover:shadow-lg transition-all duration-200"
              onClick={() => navigate('/liftings')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Stock In</p>
                    <p className="text-3xl font-bold">Liftings</p>
                    <p className="text-xs text-gray-400 mt-1">Create or review stock in records</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4 bg-cyan-500 hover:bg-cyan-600"
                  onClick={(e) => { e.stopPropagation(); navigate('/liftings'); }}
                >
                  Go to Stock In <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer border-l-4 border-l-teal-500 hover:shadow-lg transition-all duration-200"
              onClick={() => navigate('/pickup')}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Dispatch Info</p>
                    <p className="text-3xl font-bold">Pickup</p>
                    <p className="text-xs text-gray-400 mt-1">View dispatch planning and pickup details</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4 bg-teal-500 hover:bg-teal-600"
                  onClick={(e) => { e.stopPropagation(); navigate('/pickup'); }}
                >
                  Go to Dispatch Info <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Depot Manager Dashboard */}
      {hasRole('Depot Manager') && !hasRole('Management') && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Pending Verification</p>
                    <p className="text-3xl font-bold text-amber-600">{analytics?.liftings_by_status.pending || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Awaiting your action</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4 bg-amber-500 hover:bg-amber-600" 
                  onClick={() => navigate('/verification')}
                >
                  Verify Now <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Verified Today</p>
                    <p className="text-3xl font-bold text-green-600">{analytics?.liftings_by_status.verified || 0}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => navigate('/inventory')}
                >
                  View Inventory <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Pending Liftings List */}
          {pendingLiftings.length > 0 && (
            <Card>
              <div className="p-4 border-b bg-amber-50">
                <h3 className="font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Pending Verifications
                </h3>
              </div>
              <CardContent className="p-0">
                <div className="divide-y">
                  {pendingLiftings.map((lifting) => (
                    <div key={lifting.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div>
                        <p className="font-medium font-mono">{lifting.lifting_no}</p>
                        <p className="text-sm text-gray-500">{lifting.product_name} - {lifting.quantity_mt} MT</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono">{lifting.vehicle_number}</p>
                        <p className="text-xs text-gray-400">From: {lifting.loading_point_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Depot Staff Dashboard */}
      {hasRole('Depot Staff') && !hasRole('Management') && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Secondary Liftings</p>
                    <p className="text-3xl font-bold">{analytics?.counts.liftings || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Depot to Client/Depot</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                    <PackageCheck className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4 bg-purple-500 hover:bg-purple-600" 
                  onClick={() => navigate('/liftings')}
                >
                  Create Lifting <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Depot Inventory</p>
                    <p className="text-3xl font-bold">{analytics?.counts.depots || 0}</p>
                    <p className="text-xs text-gray-400 mt-1">Active depots</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                    <Warehouse className="w-6 h-6 text-white" />
                  </div>
                </div>
                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => navigate('/inventory')}
                >
                  View Inventory <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageLayout>
  );
}
