import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { usersApi, depotsApi, adminApi, productsApi, productAccessApi, depotAccessApi, exportApi, transportersApi, employeesApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { usePermissions } from '../lib/permissions';
import { Can } from '../components/Can';
import { validators } from '../lib/validation';
import { toast } from 'sonner';
import { Plus, UserCog, Trash2, Shield, Building2, Phone, CheckCircle, Clock, Pencil, Package, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const COUNTRY_CODES = [
  { code: "91", name: "India", flag: "🇮🇳" },
  { code: "977", name: "Nepal", flag: "🇳🇵" },
  { code: "880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "84", name: "Vietnam", flag: "🇻🇳" },
  { code: "975", name: "Bhutan", flag: "🇧🇹" },
  { code: "971", name: "UAE", flag: "🇦🇪" },
];

const roleDescriptions = {
  'Admin': 'Full system access - Manage all modules, users, and settings',
  'Management': 'Management level access with admin-like default permissions',
  'Loader': 'Create primary liftings from delivery orders, manage trucks',
  'Weightment': 'Verify unloading at depot, create secondary liftings, view inventory',
  'Dispatch Verifier': 'Finalize dispatch verification and confirm dispatch completion',
  'Transporter': 'Access transporter-specific records and associated transporter users',
  'Depot Supervisor': 'Verify unloading at depot, create secondary liftings, view inventory, create schedule',
  'Depot Staff': 'Create secondary liftings from depot, view inventory',
};

const roleColors = {
  'Admin': 'bg-red-100 text-red-800 border-red-200',
  'Management': 'bg-slate-100 text-slate-800 border-slate-300',
  'Loader': 'bg-blue-100 text-blue-800 border-blue-200',
  'Weightment': 'bg-green-100 text-green-800 border-green-200',
  'Dispatch Verifier': 'bg-amber-100 text-amber-800 border-amber-200',
  'Transporter': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'Depot Supervisor': 'bg-orange-100 text-orange-800 border-orange-200',
  'Depot Staff': 'bg-purple-100 text-purple-800 border-purple-200'
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { hasPermission } = usePermissions();
  const canCreateUser = hasPermission('User Management (Create)');
  const canUpdateUser = hasPermission('User Management (Update)');
  const canDeleteUser = hasPermission('User Management (Delete)');
  const [users, setUsers] = useState([]);
  const [depots, setDepots] = useState([]);
  const [products, setProducts] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    countryCode: '91',
    role: '',
    email: '',
    depot_id: '',
    transporter_id: '',
    employee_id: '',
    assigned_products: [],
    assigned_depots: [],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, depotsRes, productsRes, transportersRes, employeesRes] = await Promise.all([
        usersApi.getAll(),
        depotsApi.getAll(),
        productsApi.getAll(),
        transportersApi.getAll(),
        employeesApi.getAll({ employee_type: 'Internal' })
      ]);
      setUsers(usersRes.data);
      setDepots(depotsRes.data);
      setProducts(productsRes.data);
      setTransporters(transportersRes.data);
      setEmployees(employeesRes.data || []);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      mobile: '',
      countryCode: '91',
      role: '',
      email: '',
      depot_id: '',
      transporter_id: '',
      employee_id: '',
      assigned_products: [],
      assigned_depots: [],
    });
    setModalOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    // Extract mobile without country code
    let mobile = user.mobile || '';
    let countryCode = user.country_code || '91';
    if (mobile.startsWith(countryCode)) {
      mobile = mobile.slice(countryCode.length);
    }
    setFormData({
      name: user.name || '',
      mobile: mobile,
      countryCode: countryCode,
      role: user.role || '',
      email: user.email || '',
      depot_id: user.depot_id || '',
      transporter_id: user.transporter_id || '',
      employee_id: user.employee_id || '',
      assigned_products: user.assigned_products || [],
      assigned_depots: user.assigned_depots || [],
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    // Validation
    const errors = [];

    if (!formData.name || !formData.name.trim()) {
      errors.push('Name is required');
    }

    if (!formData.role) {
      errors.push('Role is required');
    }

    if (!editingUser) {
      if (!formData.mobile) {
        errors.push('Mobile number is required');
      } else {
        const mobileError = validators.mobile(formData.mobile, 'Mobile number');
        if (mobileError) errors.push(mobileError);
      }
    }

    if (formData.email) {
      const emailError = validators.email(formData.email, 'Email');
      if (emailError) errors.push(emailError);
    }

    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        // Update existing user
        await usersApi.update(editingUser.id, {
          name: formData.name,
          role: formData.role,
          email: formData.email || null,
          depot_id: formData.depot_id || null,
          transporter_id: formData.role === 'Transporter' ? (formData.transporter_id || null) : null,
        });
        // Update product access separately
        if (!editingUser.is_master_admin) {
          await productAccessApi.updateUserAccess(editingUser.id, formData.assigned_products);
          await depotAccessApi.updateUserAccess(editingUser.id, formData.assigned_depots);
        }
        toast.success('User updated successfully');
      } else {
        // Create new user
        const response = await adminApi.createUser({
          name: formData.name,
          mobile: formData.mobile,
          country_code: formData.countryCode,
          role: formData.role,
          email: formData.email || null,
          depot_id: formData.depot_id || null,
          transporter_id: formData.role === 'Transporter' ? (formData.transporter_id || null) : null,
          employee_id: formData.employee_id || null,
          company_id: formData.company_id || null,
          assigned_products: formData.assigned_products,
          assigned_depots: formData.assigned_depots,
        });
        toast.success(response.data.message);
      }
      setModalOpen(false);
      setEditingUser(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId) => {
    if (userId === currentUser?.id) {
      toast.error('Cannot delete your own account');
      return;
    }

    // Check if trying to delete master admin
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.is_master_admin) {
      toast.error('Cannot delete Master Admin');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await usersApi.delete(userId);
      toast.success('User deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const formatMobile = (mobile, countryCode) => {
    if (!mobile) return '-';
    // If mobile already starts with country code, format it
    if (countryCode && mobile.startsWith(countryCode)) {
      return `+${countryCode} ${mobile.slice(countryCode.length)}`;
    }
    return mobile;
  };

  const groupedUsers = users.reduce((acc, user) => {
    const role = user.role || 'Unknown';
    if (!acc[role]) acc[role] = [];
    acc[role].push(user);
    return acc;
  }, {});

  const roles = ['Admin', 'Management', 'Loader', 'Weightment', 'Dispatch Verifier', 'Transporter', 'Depot Supervisor', 'Depot Staff'];

  const computeEffectiveDepotsForUser = (user) => {
    if (user?.is_master_admin) return depots.length; // all
    const userId = user?.id;
    const role = user?.role;
    if (!depots || depots.length === 0) return 0;
    const ids = new Set();
    depots.forEach(d => {
      const assignedRoles = d.assigned_roles || [];
      if (role && assignedRoles.includes(role)) ids.add(d.id);
      if (user?.assigned_depots?.includes(d.id)) ids.add(d.id);
    });
    return ids.size;
  };

  const computeEffectiveProductsForUser = (user) => {
    if (user?.is_master_admin) return products.length;
    const role = user?.role;
    if (!products || products.length === 0) return 0;
    const ids = new Set();
    products.forEach(p => {
      const assignedRoles = p.assigned_roles || [];
      if (role && assignedRoles.includes(role)) ids.add(p.id);
      if (user?.assigned_products?.includes(p.id)) ids.add(p.id);
    });
    return ids.size;
  };

  if (loading) {
    return (
      <PageLayout title="User Management" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  const handleExportUsers = () => {
    window.open(exportApi.users(), '_blank');
    toast.success('Users export started');
  };

  return (
    <PageLayout
      title="User Management"
      subtitle="Add and manage system users by role"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportUsers}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Can action="create_user">
            <Button onClick={handleAdd} className="bg-orange-500 hover:bg-orange-600" data-testid="add-user-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </Can>
        </div>
      }
    >
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>How it works:</strong> When you create a user, they will receive an OTP on their first login attempt.
          They must verify the OTP and set their own password.
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {roles.map((role) => (
          <Card key={role} className={`border ${roleColors[role]?.split(' ')[2] || 'border-gray-200'}`}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 mb-2">
                <Shield className={`w-5 h-5 ${roleColors[role]?.split(' ')[1] || 'text-gray-600'}`} />
                <h3 className="font-semibold">{role}</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">{roleDescriptions[role]}</p>
              <p className="text-2xl font-bold">{groupedUsers[role]?.length || 0}</p>
              <p className="text-xs text-gray-400">users</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users by Role */}
      <div className="space-y-6">
        {roles.map((role) => (
          <Card key={role}>
            <CardHeader className={`border-b ${roleColors[role] || 'bg-gray-50'}`}>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                {role}s ({groupedUsers[role]?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!groupedUsers[role] || groupedUsers[role].length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  No {role.toLowerCase()}s added yet
                </div>
              ) : (
                <div className="divide-y">
                  {groupedUsers[role].map((user) => (
                    <div key={user.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-600">
                            {user.name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.name}</p>
                            {user.employee_id && (
                              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">
                                Employee
                              </span>
                            )}
                            {user.transporter_id && (
                              <span className="font-bold text-blue-600">
                               ( {user.transporter_name || transporters.find(t => t.id === user.transporter_id)?.name} )
                              </span>
                            )}
                            {user.is_master_admin && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                Master
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {formatMobile(user.mobile, user.country_code)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Password Status */}
                        <div className="flex items-center gap-1 text-sm">
                          {user.password_set !== false ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Active
                            </span>
                          ) : (
                            <span className="text-amber-600 flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Pending Setup
                            </span>
                          )}
                        </div>
                        {user.depot_id && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Building2 className="w-4 h-4" />
                            {depots.find(d => d.id === user.depot_id)?.name || 'Unknown Depot'}
                          </div>
                        )}
                        {/* Product Access Badge */}
                        {/* Depot Access Badge */}
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="w-4 h-4 text-teal-500" />
                          <span className={user.is_master_admin || (computeEffectiveDepotsForUser(user) > 0) ? 'text-green-600' : 'text-gray-400'}>
                            {user.is_master_admin ? 'All' : (computeEffectiveDepotsForUser(user) || 0)} depots
                          </span>
                        </div>

                        {/* Product Access Badge */}
                        <div className="flex items-center gap-1 text-sm">
                          <Package className="w-4 h-4 text-orange-500" />
                          <span className={user.is_master_admin || (computeEffectiveProductsForUser(user) > 0) ? 'text-green-600' : 'text-gray-400'}>
                            {user.is_master_admin ? 'All' : (computeEffectiveProductsForUser(user) || 0)} products
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {user.email || '-'}
                        </div>
                        {/* Edit Button - available for all non-master admins */}
                        {!user.is_master_admin && canUpdateUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {/* Delete Button - not for self or master admin */}
                        {user.id !== currentUser?.id && !user.is_master_admin && canDeleteUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add/Edit User Modal */}
      <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'Manrope' }}>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter full name"
                data-testid="user-name"
              />
            </div>

            <div>
              <Label>Mobile Number {editingUser ? '' : '*'}</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.countryCode}
                  onValueChange={(v) => setFormData({ ...formData, countryCode: v })}
                  disabled={!!editingUser}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRY_CODES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.flag} +{c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="flex-1"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="10-digit mobile"
                  maxLength={10}
                  data-testid="user-mobile"
                  disabled={!!editingUser}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                User will receive OTP on first login
              </p>
            </div>

            <div>
              <Label>Role *</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v, transporter_id: '' })}>
                <SelectTrigger data-testid="user-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${roleColors[role]?.split(' ')[0]}`} />
                        {role}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">{roleDescriptions[formData.role] || 'Select a role to see permissions'}</p>
            </div>

            {/* Transporter Selection - Only show for Transporter role */}
            {formData.role === 'Transporter' && (
              <div>
                <Label>Select Transporter *</Label>
                <Select value={formData.transporter_id} onValueChange={(v) => setFormData({ ...formData, transporter_id: v })}>
                  <SelectTrigger data-testid="user-transporter">
                    <SelectValue placeholder="Select a transporter" />
                  </SelectTrigger>
                  <SelectContent>
                    {transporters.length === 0 ? (
                      <div className="p-2 text-center text-gray-500 text-sm">No transporters available</div>
                    ) : (
                      transporters.map((transporter) => (
                        <SelectItem key={transporter.id} value={transporter.id.toString()}>
                          {transporter.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">This user will be mapped to the selected transporter</p>
              </div>
            )}
      
            <div>
              <Label>Email (Optional)</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            {!editingUser && (
              <div>
                <Label>Link Employee (Optional)</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => {
                    const emp = employees.find((e) => e.id === value);
                    setFormData({
                      ...formData,
                      employee_id: value,
                      name: emp?.name || formData.name,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Link an internal employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees
                      .filter((e) => !e.user_id)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">Links this login to an employee without one (syncs employee_id both ways).</p>
              </div>
            )}

            {/* Depot Access */}
            <div data-testid="depot-access-section">
              <Label className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Depot Access
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Select depots this user can access. Leave empty for no depot access.
              </p>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                {depots.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">No depots available</p>
                ) : (
                  depots.map((depot) => {
                    const explicitDepotAccess = formData.assigned_depots.includes(depot.id);
                    const roleDerivedDepotAccess = formData.role && (depot.assigned_roles || []).includes(formData.role);
                    const depotAccessChecked = explicitDepotAccess || roleDerivedDepotAccess;
                    const depotCheckboxDisabled = !explicitDepotAccess && roleDerivedDepotAccess;

                    return (
                      <div key={depot.id} className="flex items-center gap-2" data-testid={`depot-checkbox-${depot.id}`}>
                        <Checkbox
                          id={`depot-${depot.id}`}
                          checked={depotAccessChecked}
                          disabled={depotCheckboxDisabled}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                assigned_depots: [...new Set([...(formData.assigned_depots || []), depot.id])]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                assigned_depots: formData.assigned_depots.filter(id => id !== depot.id)
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor={`depot-${depot.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {depot.name}
                          {depotCheckboxDisabled && (
                            <span className="text-xs text-slate-500 ml-2">(via role/access)</span>
                          )}
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
              {formData.assigned_depots.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {formData.assigned_depots.length} depot(s) selected
                </p>
              )}
            </div>

            {/* Product Access */}
            <div data-testid="product-access-section">
              <Label className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Product Access
              </Label>
              <p className="text-xs text-gray-500 mb-2">
                Select products this user can access. Leave empty for no product access.
              </p>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                {products.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-2">No products available</p>
                ) : (
                  products.map((product) => {
                    const explicitProductAccess = formData.assigned_products.includes(product.id);
                    const roleDerivedProductAccess = formData.role && (product.assigned_roles || []).includes(formData.role);
                    const productAccessChecked = explicitProductAccess || roleDerivedProductAccess;
                    const productCheckboxDisabled = !explicitProductAccess && productAccessChecked;

                    return (
                      <div key={product.id} className="flex items-center gap-2" data-testid={`product-checkbox-${product.id}`}>
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={productAccessChecked}
                          disabled={productCheckboxDisabled}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                assigned_products: [...new Set([...(formData.assigned_products || []), product.id])]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                assigned_products: formData.assigned_products.filter(id => id !== product.id)
                              });
                            }
                          }}
                        />
                        <label
                          htmlFor={`product-${product.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {product.product_name}
                          {product.product_code && (
                            <span className="text-gray-500 ml-2 font-mono text-xs">({product.product_code})</span>
                          )}
                          {productCheckboxDisabled && (
                            <span className="text-xs text-slate-500 ml-2">(via role/access)</span>
                          )}
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
              {formData.assigned_products.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {formData.assigned_products.length} product(s) selected
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => { setModalOpen(false); setEditingUser(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                {saving ? (editingUser ? 'Saving...' : 'Creating...') : (editingUser ? 'Save Changes' : 'Create User')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
