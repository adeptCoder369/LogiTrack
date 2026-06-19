import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { analyticsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { usePermissions } from '../lib/permissions';

// Import missing icons
import {
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Factory,
  ArrowDownToLine,
  Package,
  Building2,
  Users,
  Truck,
  Container,
  Warehouse,
  ClipboardList,
  ArrowRight,
  PackageCheck,
  Wallet,
  TrainFront,
  TruckElectric,
  Train,
  UserCog,
  Settings,
  FileBarChart,
  CalendarCheck,
  CheckCircle2,
  KeyRound,
  BarChart3,
  LayoutDashboard
} from 'lucide-react';
import { LoaderDashboard } from '@/components/dashboard/LoaderDashboard';
import { ManagementDashboard } from '@/components/dashboard/ManagementDashboard';

export default function Dashboard() {
  const navigate = useNavigate();

  // Component States
  const [expandedCompanyDeliveries, setExpandedCompanyDeliveries] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const rows = analytics?.product_metrics || analytics?.liftings_product_wise || [];
  const pendingLiftings = [];

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await analyticsApi.getDashboard();
        setAnalytics(response.data);
      } catch (error) {
        console.error('Failed to load dashboard analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);
  const { user, hasRole } = useAuth();
  const { hasRoutePermission } = usePermissions();

  const navItems = [
    { to: '/delivery-orders', icon: ClipboardList, label: 'Purchase DO' },
    { to: '/liftings', icon: PackageCheck, label: 'Inventory Status' },
    { to: '/verification', icon: CheckCircle, label: 'Inventory Weight Verification' },
    { to: '/inventory', icon: Wallet, label: 'Inventory Wallet' },
    { to: '/schedule-pickup', icon: CalendarCheck, label: 'Plan Dispatch List' },
    { to: '/pickup', icon: Truck, label: 'Dispatch Info' },
    { to: '/purchase-orders', icon: ClipboardList, label: 'Purchase Orders' },
    { to: '/verify-pickup', icon: CheckCircle2, label: 'Weightment Slip' },
    { to: '/final-dispatch-verification', icon: CheckCircle2, label: 'Final Dispatch Verification' },
    { to: '/company-reports', icon: FileBarChart, label: 'Company Reports' },
    { to: '/lifting-reports', icon: FileBarChart, label: 'Lifting Reports' },
    { to: '/companies', icon: Building2, label: 'Companies' },
    { to: '/transporters', icon: TrainFront, label: 'Transporters' },
    { to: '/trucks', icon: Truck, label: 'Trucks' },
    { to: '/verified-trucks-details', icon: TruckElectric, label: 'Verified Trucks Details' },
    { to: '/railway-sidings', icon: Train, label: 'Railway Sidings' },
    { to: '/railway-zones', icon: Train, label: 'Railway Zones' },
    { to: '/products', icon: Package, label: 'Products' },
    { to: '/depots', icon: Warehouse, label: 'Depots' },
    { to: '/user-management', icon: UserCog, label: 'User Management' },
    { to: '/role-permissions', icon: Settings, label: 'Role Permissions' },
    { to: '/product-access', icon: KeyRound, label: 'Product Access' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const availableNavItems = navItems.filter(item => hasRoutePermission(item.to));


  const navigateToLiftingsWithFilter = (filter) => {
    navigate(`/liftings?filter=${filter}`);
  };

  if (loading) {
    return (
      <PageLayout title="Product Dispatch Dashboard" subtitle="Loading...">
        <div className="flex items-center justify-center h-48">
          <div className="animate-pulse text-slate-400">Loading dashboard data...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`Welcome, ${user?.name}`} subtitle={`Role: ${user?.role}`}>
      {hasRole('Management') && (
        <ManagementDashboard analytics={analytics} rows={rows} />
      )}
      {/* 5. Role-based Conditional Dashboards */}
      {/* Loader Dashboard */}
      {hasRole('Loader') && !hasRole('Management') && (
        <LoaderDashboard />
      )}

      {/* Depot Manager Dashboard */}
      {hasRole('Depot Manager') && !hasRole('Management') && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Pending Verification</p>
                    <p className="text-3xl font-bold text-amber-600">{analytics?.liftings_by_status?.pending || 0}</p>
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
                    <p className="text-3xl font-bold text-green-600">{analytics?.liftings_by_status?.verified || 0}</p>
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
        </div>
      )}

      {/* Depot Staff Dashboard */}
      {/* {hasRole('Depot Staff') && !hasRole('Management') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Secondary Liftings</p>
                  <p className="text-3xl font-bold">{analytics?.counts?.liftings || 0}</p>
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
                  <p className="text-3xl font-bold">{analytics?.counts?.depots || 0}</p>
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
      )} */}

      {/* Quick Links for Depot Staff */}
      {hasRole('Depot Staff') && !hasRole('Management') && availableNavItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {availableNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.to}
                  className="cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all"
                  onClick={() => navigate(item.to)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* No Quick Links message for Depot Staff */}
      {hasRole('Depot Staff') && !hasRole('Management') && availableNavItems.length === 0 && (
        <div className="mb-8 text-center py-8">
          <p className="text-slate-500">Oops! No modules has are active under your login. Kindly contact Admin</p>
        </div>
      )}

      {/* Quick Links for roles without a specific dashboard (Admin, etc.) */}
      {!hasRole('Management') && !hasRole('Loader') && !hasRole('Depot Manager') && !hasRole('Depot Staff') && availableNavItems.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {availableNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.to}
                  className="cursor-pointer hover:shadow-lg hover:border-slate-300 transition-all"
                  onClick={() => navigate(item.to)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
