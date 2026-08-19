import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { Sidebar } from "./components/layout/Sidebar";
import { AuthProvider, useAuth } from "./lib/auth";
import { PermissionsProvider, usePermissions } from "./lib/permissions";
import { ThemeProvider } from "./lib/theme";
import { getOfflineQueueCount } from "./lib/offline";
import { toast } from "sonner";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Companies from "./pages/Companies";
import Transporters from "./pages/Transporters";
import Trucks from "./pages/Trucks";
import RailwaySidings from "./pages/RailwaySidings";
import Products from "./pages/Products";
import Depots from "./pages/Depots";
import DeliveryOrders from "./pages/DeliveryOrders";
import Liftings from "./pages/Liftings";
import Verification from "./pages/Verification";
import InventoryWallet from "./pages/InventoryWallet";
import DOWallet from "./pages/DOWallet";
import UserManagement from "./pages/UserManagement";
import RolePermissions from "./pages/RolePermissions";
import ProductAccess from "./pages/ProductAccess";
import Analytics from "./pages/Analytics";
import CompanyReports from "./pages/CompanyReports";
import LiftingReports from "./pages/LiftingReports";
import PurchaseOrders from "./pages/PurchaseOrders";
import SchedulePickup from "./pages/SchedulePickup";
import Pickup from "./pages/Pickup";
import VerifyPickup from "./pages/VerifyPickup";
import FinalDispatchVerification from "./pages/FinalDispatchVerification";
import RailwayZones from "./pages/RailwayZones";
import VerifiedTruckDetailsPage from "./pages/VerifiedTruckDetails";
import Downloads from "./pages/Downloads";
import Tenants from "./pages/Tenants";
import RegionsAndLocations from "./pages/RegionsAndLocations";
import Leads from "./pages/Leads";
import Firms from "./pages/Firms";
import Employees from "./pages/Employees";
import DepartmentsDesignations from "./pages/DepartmentsDesignations";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Notes from "./pages/Notes";

// Protected Route Component with Dynamic Permissions
const ProtectedRoute = ({ children, permission, masterOnly }) => {
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, loading: permLoading } = usePermissions();
  if (authLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Platform-level pages are restricted to the master admin.
  if (masterOnly && !user.is_master_admin) {
    return <Navigate to="/" replace />;
  }

  // Check dynamic permission for this route
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Layout with Sidebar
const AppLayout = ({ children }) => {
  return (
    <div className="main-layout">
      <Sidebar />
      <div className="content-area">
        <div className="overflow-x-auto min-w-0 pt-4 lg:pt-0">
          {children}
        </div>
      </div>
    </div>
  );
};

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/" replace /> : <Login />
      } />

      <Route path="/" element={
        <ProtectedRoute route="/">
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/delivery-orders" element={
        <ProtectedRoute permission="Delivery Orders (View)">
          <AppLayout><DeliveryOrders /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/liftings" element={
        // <ProtectedRoute permission="Liftings (View)">
        // </ProtectedRoute>
        <AppLayout><Liftings /></AppLayout>
      } />

      <Route path="/schedule-pickup" element={
        <ProtectedRoute permission="Schedule Pickup">
          <AppLayout><SchedulePickup /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/pickup" element={
        <ProtectedRoute permission="Pickup (Execution)">
          <AppLayout><Pickup /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/verify-pickup" element={
        <ProtectedRoute permission="Verify Pickup">
          <AppLayout><VerifyPickup /></AppLayout>
        </ProtectedRoute>
      } />



      <Route path="/final-dispatch-verification" element={
        <ProtectedRoute permission="Final Dispatch Verification">
          <AppLayout><FinalDispatchVerification /></AppLayout>
        </ProtectedRoute>
      } />



      <Route path="/verification" element={
        <ProtectedRoute permission="Verification (Unloading)">
          <AppLayout><Verification /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/inventory" element={
        <ProtectedRoute permission="Inventory Wallet (View)">
          <AppLayout><InventoryWallet /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/do-wallet" element={
        <ProtectedRoute permission="DO Wallet (View)">
          <AppLayout><DOWallet /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/companies" element={
        <ProtectedRoute permission="Companies (View)">
          <AppLayout><Companies /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/transporters" element={
        <ProtectedRoute permission="Transporters (View)">
          <AppLayout><Transporters /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/trucks" element={
        <ProtectedRoute permission="Trucks (View)">
          <AppLayout><Trucks /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/verified-trucks-details" element={
        <ProtectedRoute permission="Verified Trucks Details (View)">
          <AppLayout><VerifiedTruckDetailsPage /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/railway-sidings" element={
        <ProtectedRoute permission="Railway Sidings (View)">
          <AppLayout><RailwaySidings /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/products" element={
        <ProtectedRoute permission="Products (View)">
          <AppLayout><Products /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/depots" element={
        <ProtectedRoute permission="Depots (View)">
          <AppLayout><Depots /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/user-management" element={
        <ProtectedRoute permission="User Management (View)">
          <AppLayout><UserManagement /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/role-permissions" element={
        <ProtectedRoute permission="Role Permissions">
          <AppLayout><RolePermissions /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/product-access" element={
        <ProtectedRoute permission="Product Access (View)">
          <AppLayout><ProductAccess /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/analytics" element={
        <ProtectedRoute permission="Analytics">
          <AppLayout><Analytics /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/company-reports" element={
        <ProtectedRoute permission="Company Reports">
          <AppLayout><CompanyReports /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/lifting-reports" element={
        <ProtectedRoute permission="Liftings (View)">
          <AppLayout><LiftingReports /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/purchase-orders" element={
        <ProtectedRoute permission="Purchase Orders (View)">
          <AppLayout><PurchaseOrders /></AppLayout>
        </ProtectedRoute>
      } />


      <Route path="/downloads" element={
        <ProtectedRoute permission="Downloads (View)">
          <AppLayout><Downloads /></AppLayout>
        </ProtectedRoute>
      } />


      <Route path="/railway-zones" element={
        <ProtectedRoute permission="Railway Zones (View)">
          <AppLayout><RailwayZones /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/tenants" element={
        <ProtectedRoute permission="Tenants (View)" masterOnly>
          <AppLayout><Tenants /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/regions-locations" element={
        <ProtectedRoute permission="Locations (View)">
          <AppLayout><RegionsAndLocations /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/leads" element={
        <ProtectedRoute permission="Leads (View)">
          <AppLayout><Leads /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/firms" element={
        <ProtectedRoute permission="Firms (View)">
          <AppLayout><Firms /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/employees" element={
        <ProtectedRoute permission="Employees (View)">
          <AppLayout><Employees /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/departments-designations" element={
        <ProtectedRoute permission="Departments (View)">
          <AppLayout><DepartmentsDesignations /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/invoices" element={
        <ProtectedRoute permission="Invoices (View)">
          <AppLayout><Invoices /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/payments" element={
        <ProtectedRoute permission="Payments (View)">
          <AppLayout><Payments /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="/notes" element={
        <ProtectedRoute permission="Credit Notes (View)">
          <AppLayout><Notes /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

const OfflineBanner = () => {
  const [queueCount, setQueueCount] = useState(0);
  const [online, setOnline] = useState(navigator.onLine !== false);

  useEffect(() => {
    const loadCount = async () => setQueueCount(await getOfflineQueueCount());
    loadCount();

    const handleOnline = () => {
      setOnline(true);
      loadCount();
    };

    const handleOffline = () => {
      setOnline(false);
      loadCount();
    };

    const handleSummary = (event) => setQueueCount(event.detail?.count || 0);
    const handleQueued = () => {
      toast.info('You are offline. Action queued for sync.');
      loadCount();
    };
    const handleSynced = () => loadCount();
    const handlePwaUpdate = () => {
      toast.info('A newer app version is available. Refresh to update.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('logitrack:offline-summary', handleSummary);
    window.addEventListener('logitrack:offline-queued', handleQueued);
    window.addEventListener('logitrack:offline-synced', handleSynced);
    window.addEventListener('logitrack:pwa-update', handlePwaUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('logitrack:offline-summary', handleSummary);
      window.removeEventListener('logitrack:offline-queued', handleQueued);
      window.removeEventListener('logitrack:offline-synced', handleSynced);
      window.removeEventListener('logitrack:pwa-update', handlePwaUpdate);
    };
  }, []);

  if (online && queueCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[10000] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-orange-200 bg-slate-950/95 px-4 py-3 text-center text-sm font-semibold text-white shadow-2xl backdrop-blur">
      {!online ? 'You are offline' : `${queueCount} queued action${queueCount === 1 ? '' : 's'} pending sync`}
    </div>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 0,
      retry: 1,
    },
  },
});

function App() {
  return (
    <div className="App">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <PermissionsProvider>
              <ThemeProvider>
                <AppRoutes />
                <OfflineBanner />
                <Toaster position="top-right" richColors />
              </ThemeProvider>
            </PermissionsProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </div>
  );
}

export default App;
