import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { usePermissions } from '../../lib/permissions';
import {
  TruckElectric,
  TrainFront,
  LayoutDashboard,
  Building2,
  Users,
  Truck,
  Container,
  Package,
  Warehouse,
  ClipboardList,
  BarChart3,
  Menu,
  X,
  LogOut,
  PackageCheck,
  CheckCircle,
  Wallet,
  UserCog,
  Settings,
  FileBarChart,
  Train,
  KeyRound,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ShieldCheck,
  Box,
  Download,
  Map,
  Target,
  Network,
  ArrowRightLeft,
  CreditCard
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { getFileUrl } from '../../lib/api';

// Navigation items with their routes (permissions are now dynamic)
const allNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/delivery-orders', icon: ClipboardList, label: 'Purchase DO' },
  // { to: '/do-wallet', icon: Wallet, label: 'DO Wallet' },
  { to: '/liftings', icon: PackageCheck, label: 'Inventory Status' },
  { to: '/verification', icon: CheckCircle, label: 'Inventory Weight Verification' },
  { to: '/inventory', icon: Wallet, label: 'Inventory Wallet' },
  { to: '/purchase-orders', icon: ClipboardList, label: 'Purchase Orders' },
  { to: '/schedule-pickup', icon: CalendarCheck, label: 'Plan Dispatch List' },
  { to: '/pickup', icon: Truck, label: 'Dispatch Info' },
  { to: '/verify-pickup', icon: CheckCircle2, label: 'Weightment Slip' },
  { to: '/final-dispatch-verification', icon: CheckCircle2, label: 'Final Dispatch Verification' },
  { to: '/verified-trucks-details', icon: TruckElectric, label: 'Verified Dispatch Details' },
  { to: '/company-reports', icon: FileBarChart, label: 'Company Reports' },
  { to: '/lifting-reports', icon: FileBarChart, label: 'Lifting Reports' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/leads', icon: Target, label: 'Leads' },
  { to: '/firms', icon: Network, label: 'Firms' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/departments-designations', icon: Settings, label: 'Depts & Designations' },
  { to: '/invoices', icon: FileBarChart, label: 'Invoices' },
  { to: '/payments', icon: Wallet, label: 'Payments' },
  { to: '/notes', icon: FileBarChart, label: 'Credit / Debit Notes' },
  { to: '/stock-transfers', icon: ArrowRightLeft, label: 'Stock Transfers' },
  { to: '/usage', icon: BarChart3, label: 'Usage Dashboard' },
  { to: '/billing', icon: CreditCard, label: 'Billing' },
  { to: '/regions-locations', icon: Map, label: 'Regions & Locations' },
  { to: '/transporters', icon: TrainFront, label: 'Transporters' },
  { to: '/trucks', icon: Truck, label: 'Trucks' },
  { to: '/railway-sidings', icon: Train, label: 'Railway Sidings' },
  { to: '/railway-zones', icon: Train, label: 'Railway Zones' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/depots', icon: Warehouse, label: 'Depots' },
  { to: '/user-management', icon: UserCog, label: 'User Management' },
  { to: '/role-permissions', icon: Settings, label: 'Role Permissions' },
  { to: '/product-access', icon: KeyRound, label: 'Product Access' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/downloads', icon: Download, label: 'Downloads' },
];

export const Sidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { user, logout, tenant } = useAuth();
  const { hasRoutePermission, loading, myDepots, myProducts } = usePermissions();
  const navigate = useNavigate();

  // Tenant branding (Phase 0); falls back to icon when no custom logo.
  const branding = tenant?.branding || {};
  const brandName = branding.name || 'IBRMCO';
  const rawLogo = branding.logo || '';
  const hasCustomLogo = !!rawLogo;
  const brandLogo = hasCustomLogo
    ? (rawLogo.startsWith('http') || rawLogo.startsWith('data:') ? rawLogo : getFileUrl(rawLogo))
    : null;

  useEffect(() => setLogoError(false), [rawLogo]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const loaderNavItems = [
    { to: '/liftings', icon: PackageCheck, label: 'Inventory Status' },
    { to: '/pickup', icon: Truck, label: 'Dispatch Info' },
  ];
  const weightmentNavItems = [
    { to: '/verify-pickup', icon: CheckCircle2, label: 'Weightment Slip' },
  ];

  const dispatchVerifierNavItems = [
    { to: '/final-dispatch-verification', icon: CheckCircle2, label: 'Final Dispatch Verification' },
  ];

  const navItems = user?.role === 'Loader'
    ? loaderNavItems
    : user?.role === 'Weightment'
      ? weightmentNavItems
      : user?.role === 'Dispatch Verifier'
        ? dispatchVerifierNavItems
        : [
            ...allNavItems.filter(item => {
              return hasRoutePermission(item.to);
            }),
            ...(user?.is_master_admin
              ? [{ to: '/tenants', icon: ShieldCheck, label: 'Tenants' }]
              : []),
          ];

  return (
    <>
      {/* Mobile Menu Trigger Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {hasCustomLogo && !logoError ? (
            <img src={brandLogo} alt={brandName} className="h-8 max-w-[120px] object-contain bg-white rounded-lg p-1" onError={() => setLogoError(true)} />
          ) : (
            <div className="w-8 h-8 brand-gradient rounded-lg flex items-center justify-center shadow-lg">
              <Truck className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="text-sm font-bold text-white tracking-tight font-sans">
            {brandName}
          </span>
        </div>
        <button
          data-testid="mobile-menu-btn"
          className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/60"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Dark Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        data-testid="sidebar"
        className={`
          fixed top-0 left-0 h-full w-64 z-40 flex flex-col
          bg-slate-900 border-r border-slate-800 text-slate-300
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${mobileOpen ? 'translate-x-0 top-0' : '-translate-x-full lg:translate-x-0'}
          ${mobileOpen ? 'pt-0' : 'pt-0 lg:pt-0'}
          max-lg:top-16 max-lg:h-[calc(100vh-4rem)]
        `}
      >
        {/* UPPER SECTION: Logo Header — pro: image if uploaded, else icon */}
        <div className="hidden lg:flex flex-col items-center justify-center px-6 py-6 border-b border-slate-800/60 bg-slate-950/30 backdrop-blur-sm">
          {hasCustomLogo && !logoError ? (
            <>
              <div className="bg-white rounded-xl p-2.5 shadow-lg border border-white/20 max-w-[180px] w-full flex items-center justify-center">
                <img
                  src={brandLogo}
                  alt={brandName}
                  className="max-h-10 max-w-full object-contain"
                  onError={() => setLogoError(true)}
                />
              </div>
              <p className="text-[10px] tracking-[0.22em] text-slate-400 uppercase mt-3 font-semibold">{brandName}</p>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 brand-gradient rounded-xl flex items-center justify-center shadow-lg shadow-black/20">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-[15px] font-bold text-white tracking-widest uppercase font-sans">
                {brandName}
              </h1>
            </div>
          )}
        </div>

        {/* PROFILE SECTION: User Details & Dynamic Meta Pills */}
        {user && (
          <div className="p-4 mx-3 my-3 bg-slate-850/50 rounded-xl border border-slate-800/40 bg-gradient-to-b from-slate-800/40 to-slate-900/40 shadow-sm space-y-2.5">
            <div>
              <p className="text-sm font-semibold text-slate-100 truncate">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-medium text-accent-brand tracking-medium uppercase">{user.role}</p>
              </div>
            </div>

            {/* Micro Badges / Interactive Access Info */}
            <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
              {!loading && myDepots && (
                <div className="relative group">
                  <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-900/50 hover:bg-slate-800/60 transition-colors cursor-help border border-slate-800/30">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Warehouse size={12} className="text-slate-400 flex-shrink-0" />
                      <p className="text-[11px] text-slate-400 truncate">
                        Depots: {myDepots.has_all_access ? 'All' : (myDepots.assigned_depot_ids || []).length}
                      </p>
                    </div>
                    <ChevronRight size={10} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  {myDepots.assigned_depots && myDepots.assigned_depots.length > 0 && (
                    <div className="absolute left-0 mt-1 hidden group-hover:block bg-slate-950 border border-slate-800 rounded-lg p-2.5 shadow-xl z-50 w-52 max-h-48 overflow-y-auto backdrop-blur-md">
                      <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1 px-1">Assigned Depots</p>
                      {myDepots.assigned_depots.map((d, i) => (
                        <div key={i} className="text-xs text-slate-300 py-0.5 px-1 hover:bg-slate-900 rounded truncate">
                          • {d.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!loading && myProducts && (
                <div className="relative group">
                  <div className="flex items-center justify-between p-1.5 px-2 rounded-md bg-slate-900/50 hover:bg-slate-800/60 transition-colors cursor-help border border-slate-800/30">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Box size={12} className="text-slate-400 flex-shrink-0" />
                      <p className="text-[11px] text-slate-400 truncate">
                        Products: {myProducts.has_all_access ? 'All' : (myProducts.assigned_product_ids || []).length}
                      </p>
                    </div>
                    <ChevronRight size={10} className="text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  {myProducts.assigned_products && myProducts.assigned_products.length > 0 && (
                    <div className="absolute left-0 mt-1 hidden group-hover:block bg-slate-950 border border-slate-800 rounded-lg p-2.5 shadow-xl z-50 w-52 max-h-48 overflow-y-auto backdrop-blur-md">
                      <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase mb-1 px-1">Assigned Products</p>
                      {myProducts.assigned_products.map((p, i) => (
                        <div key={i} className="text-xs text-slate-300 py-0.5 px-1 hover:bg-slate-900 rounded truncate">
                          • {p.product_name || p.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {loading && (
                <div className="text-[11px] text-slate-500 animate-pulse px-1">Syncing secure access profiles...</div>
              )}
            </div>
          </div>
        )}

        {/* MIDDLE SECTION: Scrollable Custom Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-slate-800">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-2">
              <div className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
              <div className="text-slate-500 text-xs tracking-wide">Loading configuration...</div>
            </div>
          ) : (
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group relative
                      ${isActive
                        ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700/50'
                        : 'text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                      }
                    `}
                    onClick={() => setMobileOpen(false)}
                    end={item.to === '/'}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active status indicator pill */}
                        {isActive && (
                          <div className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-accent-brand rounded-r-md" />
                        )}
                        <item.icon
                          size={18}
                          className={`transition-colors flex-shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-400 group-hover:text-slate-300'
                            }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* LOWER SECTION: Absolute Bottom Action Footer */}
        <div className="p-3 border-t border-slate-800/60 bg-slate-950/20 mt-auto">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-150 group font-medium"
            data-testid="logout-btn"
          >
            <LogOut size={18} className="text-slate-400 group-hover:text-rose-400 transition-colors flex-shrink-0" />
            <span className="text-sm">Log out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
};