import { createContext, useContext, useState, useEffect } from 'react';
import { permissionsApi, productAccessApi, depotAccessApi } from './api';
import { useAuth } from './auth';
import { normalizeRoleName } from './roleUtils';

const PermissionsContext = createContext(null);

// Map navigation routes to permission keys
const ROUTE_TO_PERMISSION = {
  '/': 'Dashboard',

  '/delivery-orders': 'Delivery Orders (View)',
  '/liftings': 'Liftings (View)',
  '/pickup': 'Pickup (Execution)',
  '/schedule-pickup': 'Schedule Pickup',
  '/verify-pickup': 'Verify Pickup',
  '/final-dispatch-verification': 'Final Dispatch Verification',
  '/verification': 'Verification (Unloading)',

  '/inventory': 'Inventory Wallet (View)',
  '/do-wallet': 'DO Wallet (View)',

  '/companies': 'Companies (View)',
  '/transporters': 'Transporters (View)',
  '/trucks': 'Trucks (View)',
  '/verified-trucks-details': 'Verified Trucks Details (View)',
  '/railway-sidings': 'Railway Sidings (View)',
  '/railway-zones': 'Railway Zones (View)',
  '/products': 'Products (View)',
  '/depots': 'Depots (View)',

  '/user-management': 'User Management (View)',
  '/role-permissions': 'Role Permissions',
  '/product-access': 'Product Access (View)',

  '/analytics': 'Analytics',
  '/company-reports': 'Company Reports',
  '/lifting-reports': 'Lifting Reports',
  '/purchase-orders': 'Purchase Orders (View)',
  '/downloads': 'Downloads (View)',
};

// Map actions to permission keys
const ACTION_PERMISSIONS = {
  // Delivery Orders
  'create_delivery_order': 'Delivery Orders (Create)',
  'update_delivery_order': 'Delivery Orders (Update)',
  'delete_delivery_order': 'Delivery Orders (Delete)',

  // Liftings
  'create_primary_lifting': 'Primary Liftings (Create)',
  'create_lifting': 'Liftings (Create)',
  'update_lifting': 'Liftings (Update)',
  'delete_lifting': 'Liftings (Delete)',

  // Secondary Liftings
  'create_secondary_lifting': 'Secondary Liftings (Create)',

  // Verification
  'verify_unloading': 'Verification (Unloading)',

  // Pickups
  'schedule_pickup': 'Schedule Pickup',
  'execute_pickup': 'Pickup (Execution)',
  'verify_pickup': 'Verify Pickup',
  'final_verify_pickup': 'Final Dispatch Verification',

  // Trucks
  'create_truck': 'Trucks (Create)',
  'update_truck': 'Trucks (Update)',
  'delete_truck': 'Trucks (Delete)',

  // Companies
  'create_company': 'Companies (Create)',
  'update_company': 'Companies (Update)',
  'delete_company': 'Companies (Delete)',

  // Transporters
  'create_transporter': 'Transporters (Create)',
  'update_transporter': 'Transporters (Update)',
  'delete_transporter': 'Transporters (Delete)',

  // Products
  'create_product': 'Products (Create)',
  'update_product': 'Products (Update)',
  'delete_product': 'Products (Delete)',

  // Depots
  'create_depot': 'Depots (Create)',
  'update_depot': 'Depots (Update)',
  'delete_depot': 'Depots (Delete)',

  // Railway Sidings
  'create_railway_siding': 'Railway Sidings (Create)',
  'update_railway_siding': 'Railway Sidings (Update)',
  'delete_railway_siding': 'Railway Sidings (Delete)',

  // Railway Zones
  'create_railway_zone': 'Railway Zones (Create)',
  'update_railway_zone': 'Railway Zones (Update)',
  'delete_railway_zone': 'Railway Zones (Delete)',

  // Verified Trucks Details
  'create_verified_truck': 'Verified Trucks Details (Create)',
  'update_verified_truck': 'Verified Trucks Details (Update)',
  'delete_verified_truck': 'Verified Trucks Details (Delete)',

  // Purchase Orders
  'create_purchase_order': 'Purchase Orders (Create)',
  'update_purchase_order': 'Purchase Orders (Update)',
  'delete_purchase_order': 'Purchase Orders (Delete)',

  // Downloads
  'create_download': 'Downloads (Create)',
  'update_download': 'Downloads (Update)',
  'delete_download': 'Downloads (Delete)',

  // User Management
  'create_user': 'User Management (Create)',
  'update_user': 'User Management (Update)',
  'delete_user': 'User Management (Delete)',

  // Company Users
  'create_company_user': 'Company Users (Create)',
  'update_company_user': 'Company Users (Update)',
  'delete_company_user': 'Company Users (Delete)',

  // Transporter Users
  'create_transporter_user': 'Transporter Users (Create)',
  'update_transporter_user': 'Transporter Users (Update)',
  'delete_transporter_user': 'Transporter Users (Delete)',
};


export const PermissionsProvider = ({ children }) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myProducts, setMyProducts] = useState(null);
  const [myDepots, setMyDepots] = useState(null);

  useEffect(() => {
    if (user) {
      fetchPermissions();
    } else {
      setPermissions(null);
      setLoading(false);
    }
  }, [user]);

  const fetchPermissions = async () => {
    try {
      const [permRes, prodRes, depotRes] = await Promise.all([
        permissionsApi.getAll(),
        productAccessApi.getMyProducts(),
        depotAccessApi.getMyDepots()
      ]);
      setPermissions(permRes.data.permissions || {});
      setMyProducts(prodRes.data || {});
      setMyDepots(depotRes.data || {});
    } catch (error) {
      console.error('Failed to fetch permissions or access data:', error);
      setPermissions({});
      setMyProducts(null);
      setMyDepots(null);
    } finally {
      setLoading(false);
    }
  };

  // Check if user has permission for a specific route
  const hasRoutePermission = (route) => {
    // While loading, allow access (the ProtectedRoute should show loading state)
    if (loading) return true;
    
    if (!user) return false;
    
    // If permissions haven't loaded yet, allow access temporarily
    if (!permissions) return true;
    
    // Management always has all permissions
    if (user.role === 'Management') return true;

    const normalizedRole = normalizeRoleName(user.role);
    const permissionKey = ROUTE_TO_PERMISSION[route];
    if (!permissionKey) return true; // If no permission mapping, allow by default

    const allowed = permissions[permissionKey]?.[normalizedRole] ?? false;

    // For product/depot list routes also ensure the user has entity-level access
    if (route === '/products' || route === '/depots') {
      return allowed && hasEntityListAccess(route);
    }

    return allowed;
  };

  // Check route-level access for product/depot lists
  const hasEntityListAccess = (route) => {
    if (loading) return true;
    if (!user) return false;
    if (user.role === 'Management') return true;

    if (route === '/products') {
      if (!myProducts) return true;
      if (myProducts.has_all_access) return true;
      return (myProducts.assigned_product_ids || []).length > 0;
    }

    if (route === '/depots') {
      if (!myDepots) return true;
      if (myDepots.has_all_access) return true;
      return (myDepots.assigned_depot_ids || []).length > 0;
    }

    return true;
  }

  // Check if user has permission for a specific action
  const hasActionPermission = (action) => {
    // While loading, deny action (safer for actions)
    if (loading || !user || !permissions) return false;
    
    // Management always has all permissions
    if (user.role === 'Management') return true;

    const normalizedRole = normalizeRoleName(user.role);
    const permissionKey = ACTION_PERMISSIONS[action];
    if (!permissionKey) return true; // If no permission mapping, allow by default
    
    return permissions[permissionKey]?.[normalizedRole] ?? false;
  };

  // Check permission by direct key (from permissions matrix)
  const hasPermission = (permissionKey) => {
    // While loading, deny permission (safer)
    if (loading || !user || !permissions) return false;
    
    // Management always has all permissions
    if (user.role === 'Management') return true;

    const normalizedRole = normalizeRoleName(user.role);
    return permissions[permissionKey]?.[normalizedRole] ?? false;
  };

  // Refresh permissions (useful after admin updates)
  const refreshPermissions = () => {
    if (user) {
      fetchPermissions();
    }
  };

  return (
    <PermissionsContext.Provider value={{ 
      permissions, 
      loading, 
      myDepots,
      myProducts,
      hasRoutePermission, 
      hasActionPermission,
      hasPermission,
      refreshPermissions 
    }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
