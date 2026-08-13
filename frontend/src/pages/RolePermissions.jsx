import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Check, X, Shield, RefreshCw, ChevronDown, Eye, PlusCircle, Edit3, Trash2, Key } from 'lucide-react';
import { permissionsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

const ensureRoleInPermissions = (permissions) => Object.fromEntries(
  Object.entries(permissions).map(([module, roleMap]) => {
    if (!roleMap || typeof roleMap !== 'object') {
      return [module, roleMap];
    }

    const normalizedRoleMap = { ...roleMap };
    if (!Object.prototype.hasOwnProperty.call(normalizedRoleMap, 'Dispatch Verifier')) {
      const fallbackValue =
        roleMap['Weightment'] ??
        roleMap['Depot Supervisor'] ??
        roleMap['Depot Staff'] ??
        roleMap['Loader'] ??
        false;

      normalizedRoleMap['Dispatch Verifier'] = fallbackValue;
    }

    if (!Object.prototype.hasOwnProperty.call(normalizedRoleMap, 'Transporter')) {
      const fallbackValue =
        roleMap['Weightment'] ??
        roleMap['Depot Supervisor'] ??
        roleMap['Depot Staff'] ??
        roleMap['Loader'] ??
        false;

      normalizedRoleMap['Transporter'] = fallbackValue;
    }

    return [module, normalizedRoleMap];
  })
);

const defaultPermissions = ensureRoleInPermissions({
// Dashboard
   "Dashboard": {
     "Admin": true,
     "Management": true,
     "Loader": true,
     "Weightment": true,
     "Transporter": true,
     "Depot Staff": true,
     "Depot Supervisor": true
   },

  // Delivery Orders
  "Delivery Orders (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Delivery Orders (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Delivery Orders (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Delivery Orders (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Purchase Orders
  "Purchase Orders (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Purchase Orders (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Purchase Orders (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Purchase Orders (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Primary Liftings
  "Primary Liftings (View)": { "Admin": true, "Management": true, "Loader": true, "Weightment": false, "Transporter": true, "Depot Staff": false, "Depot Supervisor": false },
  "Primary Liftings (Create)": { "Admin": true, "Management": true, "Loader": true, "Weightment": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Primary Liftings (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Primary Liftings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Secondary Liftings
  // "Secondary Liftings (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Depot Staff": true, "Depot Supervisor": true },
  // "Secondary Liftings (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Depot Staff": true, "Depot Supervisor": true },
  // "Secondary Liftings (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Depot Staff": false, "Depot Supervisor": false },
  // "Secondary Liftings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Depot Staff": false, "Depot Supervisor": false },






  // Liftings (combined views / dashboards)
  "Liftings (View)": { "Admin": true, "Management": true, "Loader": true, "Weightment": true, "Transporter": true, "Depot Staff": true, "Depot Supervisor": true },
  "Liftings (Create)": { "Admin": true, "Management": true, "Loader": true, "Weightment": true, "Transporter": true, "Depot Staff": true, "Depot Supervisor": true },
  "Liftings (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Liftings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Liftings (combined views / dashboards)
  "Schedule Pickup": { "Admin": true, "Management": true, "Loader": true, "Weightment": true, "Transporter": false, "Depot Staff": true, "Depot Supervisor": true },
  "Pickup (Execution)": { "Admin": true, "Management": true, "Loader": true, "Weightment": true, "Transporter": true, "Depot Staff": true, "Depot Supervisor": true },
  "Verify Pickup": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Transporter": false, "Depot Staff": false, "Depot Supervisor": true },
  "Final Dispatch Verification": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Dispatch Verifier": true, "Transporter": true, "Depot Staff": false, "Depot Supervisor": true },

// Verification
  "Verification (Unloading)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": true },

  // Verified Trucks Details
  "Verified Trucks Details (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Transporter": true, "Depot Staff": true, "Depot Supervisor": true },
  "Verified Trucks Details (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Verified Trucks Details (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Verified Trucks Details (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Inventory Wallet
  "Inventory Wallet (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Transporter": true, "Depot Staff": true, "Depot Supervisor": true },
  "Inventory Wallet (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Dispatch Verifier": false, "Transporter": true, "Depot Staff": false, "Depot Supervisor": false },
  "Inventory Wallet (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // DO Wallet
  // "DO Wallet (View)": { "Admin": true, "Management": true, "Loader": true, "Weightment": false, "Depot Staff": false, "Depot Supervisor": false },
  // "DO Wallet (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Depot Staff": false, "Depot Supervisor": false },

  // Companies
  "Companies (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Companies (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Companies (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Companies (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Company Users
  "Company Users (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Company Users (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Company Users (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Company Users (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Transporters
  "Transporters (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Dispatch Verifier": false, "Transporter": true, "Depot Staff": true, "Depot Supervisor": true },
  "Transporters (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Transporters (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Transporters (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Transporter Users
  "Transporter Users (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": true, "Depot Staff": false, "Depot Supervisor": false },
  "Transporter Users (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Transporter Users (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Transporter Users (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Trucks
  "Trucks (View)": { "Admin": true, "Management": true, "Loader": true, "Weightment": true, "Dispatch Verifier": false, "Transporter": true, "Depot Staff": true, "Depot Supervisor": true },
  "Trucks (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Trucks (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Trucks (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Railway Sidings
  "Railway Sidings (View)": { "Admin": true, "Management": true, "Loader": true, "Weightment": true, "Dispatch Verifier": false, "Transporter": true, "Depot Staff": true, "Depot Supervisor": true },
  "Railway Sidings (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Railway Sidings (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Railway Sidings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Railway Zones
  "Railway Zones (View)": { "Admin": true, "Management": true, "Loader": true, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Railway Zones (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Railway Zones (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Railway Zones (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Products
  "Products (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Dispatch Verifier": false, "Transporter": true, "Depot Staff": true, "Depot Supervisor": true },
  "Products (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Products (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Products (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Product Access
  "Product Access (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Depots
  "Depots (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": true, "Dispatch Verifier": false, "Transporter": true, "Depot Staff": true, "Depot Supervisor": true },
  "Depots (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Depots (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Depots (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // User Management
  "User Management (View)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "User Management (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "User Management (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "User Management (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Role Permissions
  "Role Permissions": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Analytics
  "Analytics": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },

  // Downloads
  "Downloads (View)": { "Admin": true, "Management": true, "Loader": true, "Weightment": true, "Dispatch Verifier": false, "Transporter": true, "Depot Staff": true, "Depot Supervisor": true },
  "Downloads (Create)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Downloads (Update)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false },
  "Downloads (Delete)": { "Admin": true, "Management": true, "Loader": false, "Weightment": false, "Dispatch Verifier": false, "Transporter": false, "Depot Staff": false, "Depot Supervisor": false }
});

// Define dependent permissions - when a parent permission is granted/revoked, these are auto-toggled
const PERMISSION_DEPENDENCIES = {
  "Liftings (View)": ["Products (View)", "Depots (View)", "Trucks (View)", "Transporters (View)", "Railway Sidings (View)"],
  "Liftings (Create)": ["Products (View)", "Depots (View)", "Trucks (View)", "Transporters (View)", "Railway Sidings (View)"],
  "Primary Liftings (View)": ["Products (View)", "Depots (View)", "Trucks (View)", "Transporters (View)", "Railway Sidings (View)"],
  "Primary Liftings (Create)": ["Products (View)", "Depots (View)", "Trucks (View)", "Transporters (View)", "Railway Sidings (View)"],
  "Secondary Liftings (View)": ["Products (View)", "Depots (View)", "Trucks (View)", "Transporters (View)", "Railway Sidings (View)"],
  "Secondary Liftings (Create)": ["Products (View)", "Depots (View)", "Trucks (View)", "Transporters (View)", "Railway Sidings (View)"],
  "Inventory Wallet (View)": ["Products (View)", "Depots (View)"],
  "Verified Trucks Details (View)": ["Products (View)", "Depots (View)"],
  "Pickup (Execution)": ["Trucks (View)", "Depots (View)"],
  "Schedule Pickup": ["Trucks (View)", "Depots (View)"]
};

const routeDisplayNames = {
  'Dashboard': 'Dashboard',

  'Delivery Orders (View)': 'Purchase DO',
  'Liftings (View)': 'Inventory Status',
  'Pickup (Execution)': 'Dispatch Info',
  'Schedule Pickup': 'Plan Dispatch List',
  'Verify Pickup': 'Weightment Slip',
  'Final Dispatch Verification': 'Final Dispatch Verification',
  'Verification (Unloading)': 'Inventory Weight Verification',
  'Verified Trucks Details (View)': 'Verified Truck Details',

  'Inventory Wallet (View)': 'Inventory Wallet',
  'DO Wallet (View)': 'DO Wallet',

  'Companies (View)': 'Companies',
  'Transporters (View)': 'Transporters',
  'Trucks (View)': 'Trucks',
  'Railway Sidings (View)': 'Railway Sidings',
  'Railway Zones (View)': 'Railway Zones',
  'Products (View)': 'Products',
  'Depots (View)': 'Depots',

  'User Management (View)': 'User Management',
  'Role Permissions': 'Role Permissions',
  'Product Access (View)': 'Product Access',
  'Analytics': 'Analytics',

  'Downloads (View)': 'Downloads',

  'Purchase Orders (View)': 'Purchase Orders',
  'Company Reports': 'Company Reports',
  'Liftings Reports': 'Lifting Reports',
};

const roles = ['Management', 'Admin', 'Loader', 'Weightment', 'Dispatch Verifier', 'Transporter', 'Depot Staff', 'Depot Supervisor'];

const roleColors = {
  'Admin': { bg: 'bg-red-500', border: 'border-red-200', light: 'bg-red-50', text: 'text-red-800' },
  'Management': { bg: 'bg-slate-500', border: 'border-slate-200', light: 'bg-slate-50', text: 'text-slate-800' },
  'Loader': { bg: 'bg-blue-500', border: 'border-blue-200', light: 'bg-blue-50', text: 'text-blue-800' },
  'Weightment': { bg: 'bg-green-500', border: 'border-green-200', light: 'bg-green-50', text: 'text-green-800' },
  'Dispatch Verifier': { bg: 'bg-amber-500', border: 'border-amber-200', light: 'bg-amber-50', text: 'text-amber-800' },
  'Transporter': { bg: 'bg-cyan-500', border: 'border-cyan-200', light: 'bg-cyan-50', text: 'text-cyan-800' },
  'Depot Supervisor': { bg: 'bg-orange-500', border: 'border-orange-200', light: 'bg-orange-50', text: 'text-orange-800' },
  'Depot Staff': { bg: 'bg-purple-500', border: 'border-purple-200', light: 'bg-purple-50', text: 'text-purple-800' },
};

const getActionMeta = (subAction) => {
  switch (subAction) {
    case 'View': return { label: 'View Access', icon: <Eye className="w-3.5 h-3.5 mr-2 text-slate-500" /> };
    case 'Create': return { label: 'Create Access', icon: <PlusCircle className="w-3.5 h-3.5 mr-2 text-slate-500" /> };
    case 'Update': return { label: 'Update Access', icon: <Edit3 className="w-3.5 h-3.5 mr-2 text-slate-500" /> };
    case 'Delete': return { label: 'Delete Access', icon: <Trash2 className="w-3.5 h-3.5 mr-2 text-slate-500" /> };
    default: return null; // We explicitly don't return meta if no action maps
  }
};
const getDisplayName = (category, actionsList) => {
  // Try to find a matching View/base permission
  for (const item of actionsList) {
    if (routeDisplayNames[item.rawKey]) {
      return routeDisplayNames[item.rawKey];
    }
  }

  // Fallback to original category
  return null;
};

export default function RolePermissions() {
  const { hasRole } = useAuth();
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [openCategories, setOpenCategories] = useState({});
  const isAdmin = hasRole(['Management']);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions_old = async () => {
    try {
      const response = await permissionsApi.getAll();
      if (response.data.permissions && Object.keys(response.data.permissions).length > 0) {
        setPermissions({ ...defaultPermissions, ...response.data.permissions });
      } else {
        setPermissions(defaultPermissions);
      }
    } catch (error) {
      console.error('Failed to load permissions');
      setPermissions(defaultPermissions);
    } finally {
      setLoading(false);
    }
  };


  const fetchPermissions = async () => {
    try {
      const response = await permissionsApi.getAll();

      if (response.data.permissions && Object.keys(response.data.permissions).length > 0) {
        // ⬇️ Create a shallow copy of incoming permissions to safely filter them
        const filteredIncoming = { ...response.data.permissions };
        console.log(filteredIncoming)
        // 🔍 Identify keys to remove (Handles common string cases/formats)
        Object.keys(filteredIncoming).forEach((key) => {
          const lowerKey = key.toLowerCase();
          if (
            lowerKey.includes("do wallet") ||
            lowerKey.includes("do_wallet") ||
            lowerKey.includes("secondary liftings") ||
            lowerKey.includes("secondary_lifting")
          ) {
            delete filteredIncoming[key];
          }
        });

        // ⬇️ Apply the sanitized object on top of your fallback defaults
        setPermissions({ ...defaultPermissions, ...filteredIncoming });
      } else {
        setPermissions(defaultPermissions);
      }
    } catch (error) {
      console.error('Failed to load permissions', error);
      setPermissions(defaultPermissions);
    } finally {
      setLoading(false);
    }
  };
  //const fetchPermissions = async () => {
  //    try {
  //      const response = await permissionsApi.getAll();
  //      if (response.data.permissions && Object.keys(response.data.permissions).length > 0) {
  //        const merged = { ...defaultPermissions, ...response.data.permissions };
  //        
  //        // Remove keys starting with "Liftings" (e.g., "Liftings (View)", "Liftings (Update)", etc.)
  //        Object.keys(merged).forEach(key => {
  //          if (key.startsWith("Liftings")) {
  //            delete merged[key];
  //          }
  //        });
  //
  //        setPermissions(merged);
  //      } else {
  //        const cleanedDefault = { ...defaultPermissions };
  //        Object.keys(cleanedDefault).forEach(key => {
  //          if (key.startsWith("Liftings")) {
  //            delete cleanedDefault[key];
  //          }
  //        });
  //        setPermissions(cleanedDefault);
  //      }
  //    } catch (error) {
  //      console.error('Failed to load permissions');
  //      const cleanedDefault = { ...defaultPermissions };
  //      Object.keys(cleanedDefault).forEach(key => {
  //        if (key.startsWith("Liftings")) {
  //          delete cleanedDefault[key];
  //        }
  //      });
  //      setPermissions(cleanedDefault);
  //    } finally {
  //      setLoading(false);
  //    }
  //  };
  const handleToggle = async (module, role) => {
    if (!isAdmin) {
      toast.error('Only Management can modify permissions');
      return;
    }
    if (role === 'Management' || role === 'Loader') {
      toast.error('Management permissions cannot be modified');
      return;
    }

    const newPermissions = { ...permissions };
    newPermissions[module] = { ...newPermissions[module] };
    const newValue = !newPermissions[module][role];
    newPermissions[module][role] = newValue;

    // Auto-toggle dependent permissions when granting (only if not already revoked by another parent)
    const dependencies = PERMISSION_DEPENDENCIES[module] || [];
    const toggledModules = []; // Track modules we toggled for rollback

    if (newValue) {
      // Granting: auto-grant dependencies
      for (const depModule of dependencies) {
        if (newPermissions[depModule]) {
          const stillNeeded = Object.entries(PERMISSION_DEPENDENCIES).some(([parent, deps]) => {
            if (parent !== module && deps.includes(depModule) && newPermissions[parent]?.[role]) {
              return true;
            }
            return false;
          });
          // Only auto-grant if no other parent requires it or if we're enabling it
          if (!stillNeeded || !newPermissions[depModule][role]) {
            newPermissions[depModule] = { ...newPermissions[depModule] };
            newPermissions[depModule][role] = true;
            toggledModules.push(depModule);
            permissionsApi.toggle(depModule, role).catch(() => { });
          }
        }
      }
    } else {
      // Revoking: check if any other parent still needs this dependency
      for (const depModule of dependencies) {
        if (newPermissions[depModule]) {
          const stillNeeded = Object.entries(PERMISSION_DEPENDENCIES).some(([parent, deps]) => {
            if (parent !== module && deps.includes(depModule) && newPermissions[parent]?.[role]) {
              return true;
            }
            return false;
          });
          if (!stillNeeded) {
            newPermissions[depModule] = { ...newPermissions[depModule] };
            newPermissions[depModule][role] = false;
            toggledModules.push(depModule);
            permissionsApi.toggle(depModule, role).catch(() => { });
          }
        }
      }
    }

    setPermissions(newPermissions);
    setHasChanges(true);

    try {
      await permissionsApi.toggle(module, role);
      toast.success(`${role} permission for "${module}" ${newValue ? 'granted' : 'revoked'}`);
    } catch (error) {
      // Rollback on error
      newPermissions[module][role] = !newValue;
      toggledModules.forEach(m => {
        newPermissions[m][role] = !newValue;
      });
      setPermissions({ ...newPermissions });
      toast.error('Failed to update permission');
    }
  };

  const handleReset = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      const response = await permissionsApi.reset();
      if (response.data.permissions) {
        setPermissions(response.data.permissions);
      } else {
        setPermissions(defaultPermissions);
      }
      setHasChanges(false);
      toast.success('Permissions reset to defaults');
    } catch (error) {
      toast.error('Failed to reset permissions');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category) => {
    setOpenCategories(prev => ({ ...prev, [category]: !prev[category] }));
  };

  const modulesList = Object.keys(permissions);
  const groupedStructure = {};

  modulesList.forEach(key => {
    const match = key.match(/^([^(]+)\s*\(([^)]+)\)$/);
    if (match) {
      const category = match[1].trim();
      const subAction = match[2].trim();
      if (!groupedStructure[category]) groupedStructure[category] = [];
      groupedStructure[category].push({ subAction, rawKey: key });
    } else {
      if (!groupedStructure[key]) groupedStructure[key] = [];
      groupedStructure[key].push({ subAction: null, rawKey: key });
    }
  });

  const PermissionToggle = ({ allowed, module, role, disabled, isDependency }) => (
    <button
      onClick={() => !disabled && handleToggle(module, role)}
      disabled={disabled}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${disabled
        ? 'cursor-not-allowed opacity-50'
        : 'cursor-pointer hover:scale-110 hover:shadow-md'
        } ${allowed
          ? 'bg-green-500 text-white'
          : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
        }`}
      title={disabled ? (isDependency ? 'Required dependency - managed automatically' : 'Management permissions cannot be changed') : `Click to ${allowed ? 'revoke' : 'grant'} permission`}
    >
      {isDependency && allowed && <Key className="absolute w-2 h-2 text-[8px] top-0.5 right-0.5" />}
      {allowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
    </button>
  );

  // Helper to check if a permission is a dependency of an active parent permission
  const isDependencyPermission = (module, role) => {
    return Object.entries(PERMISSION_DEPENDENCIES).some(([parentModule, deps]) => {
      if (deps.includes(module) && permissions[parentModule]?.[role]) {
        return true;
      }
      return false;
    });
  };

  if (loading) {
    return (
      <PageLayout title="Role Permissions" subtitle="Manage access levels">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Role Permissions"
      subtitle={isAdmin ? "Click on any permission to toggle access" : "View access levels for each role"}
      actions={
        isAdmin && (
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RefreshCw className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
            Reset to Defaults
          </Button>
        )
      }
    >
      {/* Info Banner */}
      {isAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Click on any green ✓ or gray ✗ icon to toggle permissions.
            Management permissions cannot be modified. Changes are saved automatically.
          </p>
        </div>
      )}

      {/* Role Summary Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-4 mb-8">
        {roles.map((role) => {
          const colors = roleColors[role];
          const permCount = modulesList.filter(m => permissions[m]?.[role]).length;
          return (
            <Card key={role} className={colors.border}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{role}</h3>
                    <p className="text-xs text-gray-500">{permCount} of {modulesList.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Accordion Matrix */}
      <Card>
        <CardHeader className="border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Permissions Matrix</CardTitle>
            {hasChanges && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                Changes saved automatically
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-col">
          {/* Main Matrix Sticky Columns Layout Header */}
          <div className="hidden md:grid md:grid-cols-12 items-center border-b bg-gray-50/95 py-4 px-6 text-sm font-semibold text-gray-700 sticky top-0 z-20 backdrop-blur-sm">
            <div className="col-span-4">Module / Feature Group</div>
            <div className="col-span-8 grid grid-cols-8 text-center">
              {roles.map((role) => (
                <div key={role} className="flex flex-col items-center gap-1">
                  <div className={`w-3 h-3 ${roleColors[role].bg} rounded-full`} />
                  <span className="text-xs font-medium text-gray-600">
                    {role === 'Weightment' ? 'Weightment' : role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Matrix Content Body Rows */}
          <div className="divide-y divide-gray-200 overflow-y-auto max-h-[calc(100vh-200px)]">
            {Object.entries(groupedStructure).map(([category, actionsList]) => {
              const isExpanded = !!openCategories[category];

              // Filter out elements that don't have subActions (e.g. non-bracket items)
              const validActions = actionsList.filter(item => item.subAction !== null);
              const hasMultipleActions = validActions.length > 1;

              // If there are no CRUD actions, render inline or skip if it was only a base key
              if (validActions.length === 0 && actionsList.length > 0) {
                const singleRawItem = actionsList[0];
                return (
                  <div key={category} className="p-4 md:px-6 md:py-4 md:grid md:grid-cols-12 items-center gap-4 hover:bg-blue-50/10">
                    <div className="col-span-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-800 text-sm md:text-base">
                          {category}
                        </span>

                        {routeDisplayNames[singleRawItem.rawKey] &&
                          routeDisplayNames[singleRawItem.rawKey] !== category && (
                            <span className="text-xs text-slate-500 font-medium">
                              {routeDisplayNames[singleRawItem.rawKey]}
                            </span>
                          )}
                      </div>
                    </div>
                    <div className="col-span-8 mt-4 md:mt-0 grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-0 items-center justify-items-center">
                      {roles.map(role => (
                        <div key={role} className="flex flex-col md:flex-row items-center gap-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider md:hidden ${roleColors[role].text}`}>
                            {role === 'Weightment' ? 'Weightment' : role}
                          </span>
                          <PermissionToggle
                            allowed={permissions[singleRawItem.rawKey]?.[role] ?? false}
                            module={singleRawItem.rawKey}
                            role={role}
                            disabled={
                              !isAdmin ||
                              role === 'Management' ||
                              role === 'Loader' ||
                              role === 'Weightment' ||
                              role === 'Dispatch Verifier' ||

                              isDependencyPermission(singleRawItem.rawKey, role)
                            }
                            isDependency={isDependencyPermission(singleRawItem.rawKey, role)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={category} className="transition-colors hover:bg-blue-50/10">
                  {/* Category Header Bar Row */}
                  <div
                    onClick={() => hasMultipleActions && toggleCategory(category)}
                    className={`p-4 md:px-6 md:py-4 md:grid md:grid-cols-12 items-center gap-4 ${hasMultipleActions ? 'cursor-pointer hover:bg-slate-50/50' : ''}`}
                  >
                    <div className="col-span-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800 text-sm md:text-base">
                            {category}
                          </span>

                          {getDisplayName(category, actionsList) &&
                            getDisplayName(category, actionsList) !== category && (
                              <span className="text-xs text-slate-500 font-medium">
                                {getDisplayName(category, actionsList)}
                              </span>
                            )}
                        </div>
                        {hasMultipleActions && (
                          <span className="text-[11px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {validActions.length} rules
                          </span>
                        )}
                      </div>
                      {hasMultipleActions && (
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-gray-700' : ''}`} />
                      )}
                    </div>

                    {/* Single-action rows rendered directly inline */}
                    {!hasMultipleActions && validActions.length === 1 && (
                      <div className="col-span-8 mt-4 md:mt-0 grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-0 items-center justify-items-center">
                        {roles.map(role => (
                          <div key={role} className="flex flex-col md:flex-row items-center gap-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider md:hidden ${roleColors[role].text}`}>
                              {role === 'Weightment' ? 'Weightment' : role}
                            </span>
                            <PermissionToggle
                              allowed={permissions[validActions[0].rawKey]?.[role] ?? false}
                              module={validActions[0].rawKey}
                              role={role}
                              disabled={
                                !isAdmin ||
                                role === 'Management' ||
                                role === 'Loader' ||
                                role === 'Weightment' ||
                                role === 'Dispatch Verifier' ||

                                isDependencyPermission(validActions[0].rawKey, role)}
                              isDependency={isDependencyPermission(validActions[0].rawKey, role)}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pro Feature: Summary view rendered inside cells when a group is COLLAPSED */}
                    {hasMultipleActions && !isExpanded && (
                      <div className="col-span-8 mt-4 md:mt-0 grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-0 items-center justify-items-center animate-fadeIn">
                        {roles.map(role => {
                          const total = validActions.length;
                          const allowedCount = validActions.filter(({ rawKey }) => permissions[rawKey]?.[role]).length;

                          return (
                            <div key={role} className="flex flex-col items-center justify-center">
                              <span className={`text-[10px] font-bold uppercase tracking-wider md:hidden mb-1 ${roleColors[role].text}`}>
                                {role === 'Weightment' ? 'Weightment' : role}
                              </span>

                              {/* Compact Mini Dashboard Badge per Role Cell */}
                              <div className={`flex flex-col items-center px-2 py-1 rounded-md transition-all border ${allowedCount === total ? 'bg-green-50 border-green-200' :
                                allowedCount === 0 ? 'bg-gray-50 border-gray-100 opacity-40' :
                                  `${roleColors[role].light} ${roleColors[role].border}`
                                }`}>
                                <span className={`text-[11px] font-bold ${allowedCount === total ? 'text-green-700' :
                                  allowedCount === 0 ? 'text-gray-400' :
                                    roleColors[role].text
                                  }`}>
                                  {allowedCount}/{total}
                                </span>

                                {/* Structural Micro-Dot Map Grid Indicator */}
                                <div className="flex gap-0.5 mt-1 justify-center items-center">
                                  {validActions.map(({ rawKey }, idx) => (
                                    <div
                                      key={idx}
                                      className={`w-1.5 h-1.5 rounded-full ${permissions[rawKey]?.[role] ? 'bg-green-500' : 'bg-gray-300'
                                        }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Accordion Expanded Details Content (CRUD Rows) */}
                  {hasMultipleActions && isExpanded && (
                    <div className="bg-gray-50/40 border-t border-b border-gray-100 divide-y divide-gray-100">
                      {validActions.map(({ subAction, rawKey }) => {
                        const meta = getActionMeta(subAction);
                        if (!meta) return null; // Avoid rendering anything if meta is missing

                        return (
                          <div key={rawKey} className="p-3 md:px-6 md:py-3 md:grid md:grid-cols-12 items-center gap-4 hover:bg-slate-50/80 transition-colors">
                            <div className="col-span-4 pl-4 md:pl-6 flex items-center text-xs font-medium text-gray-600">
                              {meta.icon}
                              <span>{meta.label}</span>
                            </div>
                            <div className="col-span-8 mt-2 md:mt-0 grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-0 items-center justify-items-center">
                              {roles.map(role => (
                                <div key={role} className="flex flex-col md:flex-row items-center gap-1">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider md:hidden ${roleColors[role].text}`}>
                                    {role === 'Weightment' ? 'Weightment' : role}
                                  </span>
                                  <PermissionToggle
                                    allowed={permissions[rawKey]?.[role] ?? false}
                                    module={rawKey}
                                    role={role}
                                    disabled={!isAdmin || role === 'Management' || role === 'Loader' || role === 'Weightment' || role === 'Dispatch Verifier' || isDependencyPermission(rawKey, role)}
                                    isDependency={isDependencyPermission(rawKey, role)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role Badge Descriptions Blocks */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((role) => {
          const colors = roleColors[role];
          const grantedModules = modulesList.filter(m => permissions[m]?.[role]);
          return (
            <Card key={role} className="shadow-sm">
              <CardHeader className={`border-b ${colors.light}`}>
                <CardTitle className={`text-lg ${colors.text}`}>{role} Role</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  Has access to <span className="font-semibold">{grantedModules.length}</span> individual feature keys:
                </p>
                <div className="flex flex-wrap gap-2">
                  {grantedModules.map((module) => (
                    <span
                      key={module}
                      className={`text-xs ${colors.light} ${colors.text} px-2.5 py-1 rounded-full font-medium border border-current opacity-90`}
                    >
                      {module}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PageLayout>
  );
}
