// import { useState, useEffect } from 'react';
// import { PageLayout } from '../components/layout/PageLayout';
// import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
// import { Button } from '../components/ui/button';
// import { Check, X, Shield, Save, RefreshCw } from 'lucide-react';
// import { permissionsApi } from '../lib/api';
// import { useAuth } from '../lib/auth';
// import { toast } from 'sonner';

// const defaultPermissions = {
//   // Dashboard
//   "Dashboard": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },

//   // Delivery Orders
//   "Delivery Orders (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Delivery Orders (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Delivery Orders (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Delivery Orders (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },


//   // Purchase Orders
//   "Purchase Orders (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Purchase Orders (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Purchase Orders (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Purchase Orders (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Primary Liftings
//   "Primary Liftings (View)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Primary Liftings (Create)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Primary Liftings (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Primary Liftings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Secondary Liftings
//   "Secondary Liftings (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
//   "Secondary Liftings (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
//   "Secondary Liftings (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": false, "Depot Supervisor": false },
//   "Secondary Liftings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Liftings (combined views / dashboards)
//   "Liftings (View)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
//   "Liftings (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": false, "Depot Supervisor": false },
//   "Liftings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Liftings (combined views / dashboards)
//   "Schedule Pickup": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
//   "Pickup (Execution)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
//   "Verify Pickup": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": false, "Depot Supervisor": true },

//   // Verification
//   "Verification (Unloading)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": false, "Depot Supervisor": false },

//   // Inventory Wallet
//   "Inventory Wallet (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
//   "Inventory Wallet (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": false, "Depot Supervisor": false },
//   "Inventory Wallet (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // DO Wallet
//   "DO Wallet (View)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "DO Wallet (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Companies
//   "Companies (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Companies (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Companies (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Companies (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Transporters
//   "Transporters (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Transporters (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Transporters (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Transporters (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Trucks
//   "Trucks (View)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Trucks (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Trucks (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Trucks (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Railway Sidings
//   "Railway Sidings (View)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Railway Sidings (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Railway Sidings (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Railway Sidings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Products
//   "Products (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Products (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Products (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Products (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Depots
//   "Depots (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Depots (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Depots (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "Depots (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // User Management
//   "User Management (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "User Management (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "User Management (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
//   "User Management (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Role Permissions
//   "Role Permissions": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

//   // Analytics
//   "Analytics": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false }
// };


// const roles = ['Admin', 'Management', 'Loader', 'Depot Manager', 'Depot Staff', 'Depot Supervisor'];

// const roleColors = {
//   'Admin': { bg: 'bg-red-500', border: 'border-red-200', light: 'bg-red-50', text: 'text-red-800' },
//   'Management': { bg: 'bg-slate-500', border: 'border-slate-200', light: 'bg-slate-50', text: 'text-slate-800' },
//   'Loader': { bg: 'bg-blue-500', border: 'border-blue-200', light: 'bg-blue-50', text: 'text-blue-800' },
//   'Depot Manager': { bg: 'bg-green-500', border: 'border-green-200', light: 'bg-green-50', text: 'text-green-800' },
//   'Depot Supervisor': { bg: 'bg-orange-500', border: 'border-orange-200', light: 'bg-black-50', text: 'text-orange-800' },
//   'Depot Staff': { bg: 'bg-purple-500', border: 'border-purple-200', light: 'bg-purple-50', text: 'text-purple-800' },
// };

// export default function RolePermissions() {
//   const { hasRole } = useAuth();
//   const [permissions, setPermissions] = useState(defaultPermissions);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [hasChanges, setHasChanges] = useState(false);

//   const isAdmin = hasRole(['Admin']);

//   useEffect(() => {
//     fetchPermissions();
//   }, []);

//   const fetchPermissions = async () => {
//     try {
//       const response = await permissionsApi.getAll();
//       if (response.data.permissions && Object.keys(response.data.permissions).length > 0) {
//         // Merge with defaults to ensure all modules are present
//         setPermissions({ ...defaultPermissions, ...response.data.permissions });
//       } else {
//         // Use defaults if permissions is empty
//         setPermissions(defaultPermissions);
//       }
//     } catch (error) {
//       console.error('Failed to load permissions');
//       // Fall back to defaults on error
//       setPermissions(defaultPermissions);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleToggle = async (module, role) => {
//     if (!isAdmin) {
//       toast.error('Only Admin can modify permissions');
//       return;
//     }
//     if (role === 'Admin') {
//       toast.error('Admin permissions cannot be modified');
//       return;
//     }

//     // Optimistic update
//     const newPermissions = { ...permissions };
//     newPermissions[module] = { ...newPermissions[module] };
//     newPermissions[module][role] = !newPermissions[module][role];
//     setPermissions(newPermissions);
//     setHasChanges(true);

//     try {
//       await permissionsApi.toggle(module, role);
//       toast.success(`${role} permission for "${module}" ${newPermissions[module][role] ? 'granted' : 'revoked'}`);
//     } catch (error) {
//       // Revert on error
//       newPermissions[module][role] = !newPermissions[module][role];
//       setPermissions({ ...newPermissions });
//       toast.error('Failed to update permission');
//     }
//   };

//   const handleReset = async () => {
//     if (!isAdmin) return;

//     setSaving(true);
//     try {
//       const response = await permissionsApi.reset();
//       if (response.data.permissions) {
//         setPermissions(response.data.permissions);
//       } else {
//         setPermissions(defaultPermissions);
//       }
//       setHasChanges(false);
//       toast.success('Permissions reset to defaults');
//     } catch (error) {
//       toast.error('Failed to reset permissions');
//     } finally {
//       setSaving(false);
//     }
//   };

//   const PermissionToggle = ({ allowed, module, role, disabled }) => (
//     <button
//       onClick={() => !disabled && handleToggle(module, role)}
//       disabled={disabled}
//       className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
//         disabled 
//           ? 'cursor-not-allowed opacity-50' 
//           : 'cursor-pointer hover:scale-110 hover:shadow-md'
//       } ${
//         allowed 
//           ? 'bg-green-500 text-white' 
//           : 'bg-gray-200 text-gray-400 hover:bg-gray-300'
//       }`}
//       title={disabled ? 'Admin permissions cannot be changed' : `Click to ${allowed ? 'revoke' : 'grant'} permission`}
//     >
//       {allowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
//     </button>
//   );

//   const modules = Object.keys(permissions);

//   if (loading) {
//     return (
//       <PageLayout title="Role Permissions" subtitle="Manage access levels">
//         <div className="flex items-center justify-center h-64">
//           <div className="animate-pulse text-slate-400">Loading...</div>
//         </div>
//       </PageLayout>
//     );
//   }

//   return (
//     <PageLayout
//       title="Role Permissions"
//       subtitle={isAdmin ? "Click on any permission to toggle access" : "View access levels for each role"}
//       actions={
//         isAdmin && (
//           <Button variant="outline" onClick={handleReset} disabled={saving}>
//             <RefreshCw className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
//             Reset to Defaults
//           </Button>
//         )
//       }
//     >
//       {/* Info Banner */}
//       {isAdmin && (
//         <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
//           <p className="text-sm text-blue-800">
//             <strong>Tip:</strong> Click on any green ✓ or gray ✗ icon to toggle permissions. 
//             Admin permissions cannot be modified. Changes are saved automatically.
//           </p>
//         </div>
//       )}

//       {/* Role Summary */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
//         {roles.map((role) => {
//           const colors = roleColors[role];
//           const permCount = modules.filter(m => permissions[m]?.[role]).length;
//           return (
//             <Card key={role} className={colors.border}>
//               <CardContent className="pt-4">
//                 <div className="flex items-center gap-3">
//                   <div className={`w-10 h-10 ${colors.bg} rounded-lg flex items-center justify-center`}>
//                     <Shield className="w-5 h-5 text-white" />
//                   </div>
//                   <div>
//                     <h3 className="font-semibold">{role}</h3>
//                     <p className="text-xs text-gray-500">{permCount} of {modules.length} permissions</p>
//                   </div>
//                 </div>
//               </CardContent>
//             </Card>
//           );
//         })}
//       </div>

//       {/* Permissions Matrix */}
//       <Card>
//         <CardHeader className="border-b bg-gray-50">
//           <div className="flex items-center justify-between">
//             <CardTitle className="text-lg">Permissions Matrix</CardTitle>
//             {hasChanges && (
//               <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
//                 Changes saved automatically
//               </span>
//             )}
//           </div>
//         </CardHeader>
//         <CardContent className="p-0">
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="border-b bg-gray-50">
//                   <th className="text-left px-6 py-4 font-semibold text-gray-700">Module / Feature</th>
//                   {roles.map((role) => (
//                     <th key={role} className="text-center px-4 py-4">
//                       <div className="flex flex-col items-center gap-1">
//                         <div className={`w-3 h-3 ${roleColors[role].bg} rounded-full`} />
//                         <span className="text-xs font-medium text-gray-600">
//                           {role === 'Depot Manager' ? 'Depot Mgr' : role}
//                         </span>
//                       </div>
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {modules.map((module, idx) => (
//                   <tr key={module} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30`}>
//                     <td className="px-6 py-3 font-medium text-gray-800">{module}</td>
//                     {roles.map((role) => (
//                       <td key={role} className="text-center px-4 py-3">
//                         <div className="flex justify-center">
//                           <PermissionToggle 
//                             allowed={permissions[module]?.[role] ?? false} 
//                             module={module}
//                             role={role}
//                             disabled={!isAdmin || role === 'Admin'}
//                           />
//                         </div>
//                       </td>
//                     ))}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Role Descriptions */}
//       <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
//         {roles.map((role) => {
//           const colors = roleColors[role];
//           const grantedModules = modules.filter(m => permissions[m]?.[role]);
//           return (
//             <Card key={role}>
//               <CardHeader className={`border-b ${colors.light}`}>
//                 <CardTitle className={`text-lg ${colors.text}`}>{role} Role</CardTitle>
//               </CardHeader>
//               <CardContent className="pt-4">
//                 <p className="text-sm text-gray-600 mb-3">
//                   Has access to <span className="font-semibold">{grantedModules.length}</span> modules:
//                 </p>
//                 <div className="flex flex-wrap gap-2">
//                   {grantedModules.map((module) => (
//                     <span 
//                       key={module} 
//                       className={`text-xs ${colors.light} ${colors.text} px-2 py-1 rounded-full`}
//                     >
//                       {module}
//                     </span>
//                   ))}
//                 </div>
//               </CardContent>
//             </Card>
//           );
//         })}
//       </div>
//     </PageLayout>
//   );
// }

import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Check, X, Shield, RefreshCw, ChevronDown, Eye, PlusCircle, Edit3, Trash2, Key } from 'lucide-react';
import { permissionsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';

const defaultPermissions = {
  // Dashboard
  "Dashboard": {
    "Admin": true,
    "Management": true,
    "Loader": true, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true
  },

  // Delivery Orders
  "Delivery Orders (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Delivery Orders (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Delivery Orders (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Delivery Orders (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Purchase Orders
  "Purchase Orders (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Purchase Orders (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Purchase Orders (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Purchase Orders (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Primary Liftings
  "Primary Liftings (View)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Primary Liftings (Create)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Primary Liftings (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Primary Liftings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Secondary Liftings
  "Secondary Liftings (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
  "Secondary Liftings (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
  "Secondary Liftings (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": false, "Depot Supervisor": false },
  "Secondary Liftings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Liftings (combined views / dashboards)
  "Liftings (View)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
  "Liftings (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": false, "Depot Supervisor": false },
  "Liftings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Liftings (combined views / dashboards)
  "Schedule Pickup": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
  "Pickup (Execution)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
  "Verify Pickup": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": false, "Depot Supervisor": true },

  // Verification
  "Verification (Unloading)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": false, "Depot Supervisor": false },

  // Inventory Wallet
  "Inventory Wallet (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": true, "Depot Supervisor": true },
  "Inventory Wallet (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": true, "Depot Staff": false, "Depot Supervisor": false },
  "Inventory Wallet (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // DO Wallet
  "DO Wallet (View)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "DO Wallet (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Companies
  "Companies (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Companies (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Companies (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Companies (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Transporters
  "Transporters (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Transporters (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Transporters (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Transporters (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Trucks
  "Trucks (View)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Trucks (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Trucks (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Trucks (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Railway Sidings
  "Railway Sidings (View)": { "Admin": true, "Management": true, "Loader": true, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Railway Sidings (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Railway Sidings (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Railway Sidings (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Products
  "Products (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Products (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Products (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Products (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Depots
  "Depots (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Depots (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Depots (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "Depots (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // User Management
  "User Management (View)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "User Management (Create)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "User Management (Update)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },
  "User Management (Delete)": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Role Permissions
  "Role Permissions": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false },

  // Analytics
  "Analytics": { "Admin": true, "Management": true, "Loader": false, "Depot Manager": false, "Depot Staff": false, "Depot Supervisor": false }
};

const roles = ['Management', 'Admin', 'Loader', 'Depot Manager', 'Depot Staff', 'Depot Supervisor'];

const roleColors = {
  'Admin': { bg: 'bg-red-500', border: 'border-red-200', light: 'bg-red-50', text: 'text-red-800' },
  'Management': { bg: 'bg-slate-500', border: 'border-slate-200', light: 'bg-slate-50', text: 'text-slate-800' },
  'Loader': { bg: 'bg-blue-500', border: 'border-blue-200', light: 'bg-blue-50', text: 'text-blue-800' },
  'Depot Manager': { bg: 'bg-green-500', border: 'border-green-200', light: 'bg-green-50', text: 'text-green-800' },
  'Depot Supervisor': { bg: 'bg-orange-500', border: 'border-orange-200', light: 'bg-orange-50', text: 'text-orange-800' },
  'Depot Staff': { bg: 'bg-purple-500', border: 'border-purple-200', light: 'bg-purple-50', text: 'text-purple-800' },
};

const getActionMeta = (subAction) => {
  switch (subAction) {
    case 'View': return { label: 'View Access', icon: <Eye className="w-3.5 h-3.5 mr-2 text-slate-500" /> };
    case 'Create': return { label: 'Create Access', icon: <PlusCircle className="w-3.5 h-3.5 mr-2 text-slate-500" /> };
    case 'Update': return { label: 'Update Access', icon: <Edit3 className="w-3.5 h-3.5 mr-2 text-slate-500" /> };
    case 'Delete': return { label: 'Delete Access', icon: <Trash2 className="w-3.5 h-3.5 mr-2 text-slate-500" /> };
    default: return { label: subAction, icon: <Key className="w-3.5 h-3.5 mr-2 text-slate-400" /> };
  }
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

  const fetchPermissions = async () => {
    try {
      const response = await permissionsApi.getAll();
      console.log('---------', response.data.permissions)
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

  const handleToggle = async (module, role) => {
    if (!isAdmin) {
      toast.error('Only Admin can modify permissions');
      return;
    }
    if (role === 'Admin') {
      toast.error('Admin permissions cannot be modified');
      return;
    }

    const newPermissions = { ...permissions };
    newPermissions[module] = { ...newPermissions[module] };
    newPermissions[module][role] = !newPermissions[module][role];
    setPermissions(newPermissions);
    setHasChanges(true);

    try {
      await permissionsApi.toggle(module, role);
      toast.success(`${role} permission for "${module}" ${newPermissions[module][role] ? 'granted' : 'revoked'}`);
    } catch (error) {
      newPermissions[module][role] = !newPermissions[module][role];
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
  const PermissionToggle = ({ allowed, module, role, disabled }) => (
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
      title={disabled ? 'Admin permissions cannot be changed' : `Click to ${allowed ? 'revoke' : 'grant'} permission`}
    >
      {allowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
    </button>
  );

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
            Admin permissions cannot be modified. Changes are saved automatically.
          </p>
        </div>
      )}

      {/* Role Summary Blocks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
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

        <CardContent className="p-0">
          {/* Main Matrix Sticky Columns Layout Header */}
          <div className="hidden md:grid md:grid-cols-12 items-center border-b bg-gray-50/70 py-4 px-6 text-sm font-semibold text-gray-700">
            <div className="col-span-4">Module / Feature Group</div>
            <div className="col-span-8 grid grid-cols-6 text-center">
              {roles.map((role) => (
                <div key={role} className="flex flex-col items-center gap-1">
                  <div className={`w-3 h-3 ${roleColors[role].bg} rounded-full`} />
                  <span className="text-xs font-medium text-gray-600">
                    {role === 'Depot Manager' ? 'Depot Mgr' : role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Matrix Content Body Rows */}
          <div className="divide-y divide-gray-200">
            {Object.entries(groupedStructure).map(([category, actionsList]) => {
              const isExpanded = !!openCategories[category];
              const hasMultipleActions = actionsList.length > 1;

              return (
                <div key={category} className="transition-colors hover:bg-blue-50/10">
                  {/* Category Header Bar Row */}
                  <div
                    onClick={() => hasMultipleActions && toggleCategory(category)}
                    className={`p-4 md:px-6 md:py-4 md:grid md:grid-cols-12 items-center gap-4 ${hasMultipleActions ? 'cursor-pointer hover:bg-slate-50/50' : ''}`}
                  >
                    <div className="col-span-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800 text-sm md:text-base">{category}</span>
                        {hasMultipleActions && (
                          <span className="text-[11px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                            {actionsList.length} rules
                          </span>
                        )}
                      </div>
                      {hasMultipleActions && (
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-gray-700' : ''}`} />
                      )}
                    </div>

                    {/* Single-action rows rendered directly inline (e.g. Dashboard) */}
                    {!hasMultipleActions && (
                      <div className="col-span-8 mt-4 md:mt-0 grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-0 items-center justify-items-center">
                        {roles.map(role => (
                          <div key={role} className="flex flex-col md:flex-row items-center gap-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider md:hidden ${roleColors[role].text}`}>
                              {role === 'Depot Manager' ? 'Depot Mgr' : role}
                            </span>
                            <PermissionToggle
                              allowed={permissions[actionsList[0].rawKey]?.[role] ?? false}
                              module={actionsList[0].rawKey}
                              role={role}
                              disabled={!isAdmin || role === 'Admin'}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pro Feature: Summary view rendered inside cells when a group is COLLAPSED */}
                    {hasMultipleActions && !isExpanded && (
                      <div className="col-span-8 mt-4 md:mt-0 grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-0 items-center justify-items-center animate-fadeIn">
                        {roles.map(role => {
                          const total = actionsList.length;
                          const allowedCount = actionsList.filter(({ rawKey }) => permissions[rawKey]?.[role]).length;

                          return (
                            <div key={role} className="flex flex-col items-center justify-center">
                              <span className={`text-[10px] font-bold uppercase tracking-wider md:hidden mb-1 ${roleColors[role].text}`}>
                                {role === 'Depot Manager' ? 'Depot Mgr' : role}
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
                                  {actionsList.map(({ rawKey }, idx) => (
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
                      {actionsList.map(({ subAction, rawKey }) => {
                        const meta = getActionMeta(subAction);
                        return (
                          <div key={rawKey} className="p-3 md:px-6 md:py-3 md:grid md:grid-cols-12 items-center gap-4 hover:bg-slate-50/80 transition-colors">
                            <div className="col-span-4 pl-4 md:pl-6 flex items-center text-xs font-medium text-gray-600">
                              {meta.icon}
                              <span>{meta.label}</span>
                            </div>
                            <div className="col-span-8 mt-2 md:mt-0 grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-0 items-center justify-items-center">
                              {roles.map(role => (
                                <div key={role} className="flex flex-col md:flex-row items-center gap-1">
                                  <span className={`text-[10px] font-bold uppercase tracking-wider md:hidden ${roleColors[role].text}`}>
                                    {role === 'Depot Manager' ? 'Depot Mgr' : role}
                                  </span>
                                  <PermissionToggle
                                    allowed={permissions[rawKey]?.[role] ?? false}
                                    module={rawKey}
                                    role={role}
                                    disabled={!isAdmin || role === 'Admin'}
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