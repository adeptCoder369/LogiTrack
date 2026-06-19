import { useState, useEffect, useRef } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable } from '../components/shared/DataTable';
import { FormModal } from '../components/shared/FormModal';
import { DeleteDialog } from '../components/shared/DeleteDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { transportersApi, importApi } from '../lib/api';
import { toast } from 'sonner';
import { Plus, Upload, Download, Users, X, Edit, Trash2, User, Phone, Mail, MapPin } from 'lucide-react';
import { Can } from '../components/Can';
import { usePermissions } from '../lib/permissions';

const columns = [
  { key: 'name', label: 'Transporter Name', render: (v, row) => (
    <div className="flex items-center gap-2">
      <span className="font-medium">{v}</span>
      {row.users?.length > 0 && (
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
          {row.users.length} users
        </span>
      )}
    </div>
  )},
  { key: 'trade_name', label: 'Trade Name' },
  { key: 'contact_person_name', label: 'Contact Person' },
  { key: 'mobile_number', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'industry_type', label: 'Industry' },
];

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh'
];

export default function Transporters() {
  const { hasActionPermission, hasPermission } = usePermissions();
  const canViewTransporterUsers = hasPermission('Transporter Users (View)');
  const canCreateTransporterUsers = hasPermission('Transporter Users (Create)');
  const canUpdateTransporterUsers = hasPermission('Transporter Users (Update)');
  const canDeleteTransporterUsers = hasPermission('Transporter Users (Delete)');
  const canCreateTransporter = hasPermission('Transporters (Create)');
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  
  // Transporter Users state
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userDeleteOpen, setUserDeleteOpen] = useState(false);
  const [selectedTransporter, setSelectedTransporter] = useState(null);
  const [transporterUsers, setTransporterUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    trade_name: '',
    contact_person_name: '',
    mobile_number: '',
    email: '',
    address: '',
    gst_number: '',
    pan_number: '',
    industry_type: '',
    website: '',
  });

  const [userFormData, setUserFormData] = useState({
    name: '',
    title: '',
    date_of_birth: '',
    marital_status: '',
    date_of_anniversary: '',
    mobile_number: '',
    email: '',
    whatsapp_number: '',
    emergency_contact: '',
    address: '',
    city: '',
    district: '',
    state: '',
    pin_code: '',
    country: 'India',
    pan_number: '',
    aadhaar_number: '',
    remarks: '',
  });

  useEffect(() => {
    fetchTransporters();
  }, []);

  const fetchTransporters = async () => {
    try {
      const res = await transportersApi.getAll();
      setTransporters(res.data);
    } catch (error) {
      toast.error('Failed to load transporters');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransporterUsers = async (transporterId) => {
    setLoadingUsers(true);
    try {
      const res = await transportersApi.getUsers(transporterId);
      setTransporterUsers(res.data);
    } catch (error) {
      toast.error('Failed to load transporter users');
      setTransporterUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setFormData({
      name: '',
      trade_name: '',
      contact_person_name: '',
      mobile_number: '',
      email: '',
      address: '',
      gst_number: '',
      pan_number: '',
      industry_type: '',
      website: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      trade_name: item.trade_name || '',
      contact_person_name: item.contact_person_name || '',
      mobile_number: item.mobile_number || '',
      email: item.email || '',
      address: item.address || '',
      gst_number: item.gst_number || '',
      pan_number: item.pan_number || '',
      industry_type: item.industry_type || '',
      website: item.website || '',
    });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  // Manage Users
  const handleManageUsers = (transporter) => {
    setSelectedTransporter(transporter);
    fetchTransporterUsers(transporter.id);
    setUsersModalOpen(true);
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setUserFormData({
      name: '',
      title: '',
      date_of_birth: '',
      marital_status: '',
      date_of_anniversary: '',
      mobile_number: '',
      email: '',
      whatsapp_number: '',
      emergency_contact: '',
      address: '',
      city: '',
      district: '',
      state: '',
      pin_code: '',
      country: 'India',
      pan_number: '',
      aadhaar_number: '',
      remarks: '',
    });
    setUserFormOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setUserFormData({
      name: user.name || '',
      title: user.title || '',
      date_of_birth: user.date_of_birth || '',
      marital_status: user.marital_status || '',
      date_of_anniversary: user.date_of_anniversary || '',
      mobile_number: user.mobile_number || '',
      email: user.email || '',
      whatsapp_number: user.whatsapp_number || '',
      emergency_contact: user.emergency_contact || '',
      address: user.address || '',
      city: user.city || '',
      district: user.district || '',
      state: user.state || '',
      pin_code: user.pin_code || '',
      country: user.country || 'India',
      pan_number: user.pan_number || '',
      aadhaar_number: user.aadhaar_number || '',
      remarks: user.remarks || '',
    });
    setUserFormOpen(true);
  };

  const handleDeleteUser = (user) => {
    setSelectedUser(user);
    setUserDeleteOpen(true);
  };

  const handleSubmitUser = async () => {
    if (selectedUser && !canUpdateTransporterUsers) {
      return toast.error('You do not have permission to update users');
    }
    if (!selectedUser && !canCreateTransporterUsers) {
      return toast.error('You do not have permission to create users');
    }
    if (!userFormData.name) {
      toast.error('User name is required');
      return;
    }
    setSaving(true);
    try {
      if (selectedUser) {
        await transportersApi.updateUser(selectedTransporter.id, selectedUser.id, userFormData);
        toast.success('User updated successfully');
      } else {
        await transportersApi.addUser(selectedTransporter.id, userFormData);
        toast.success('User added successfully');
      }
      setUserFormOpen(false);
      fetchTransporterUsers(selectedTransporter.id);
      fetchTransporters();
    } catch (error) {
      toast.error('Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!canDeleteTransporterUsers) {
      return toast.error('You do not have permission to delete users');
    }
    setSaving(true);
    try {
      await transportersApi.deleteUser(selectedTransporter.id, selectedUser.id);
      toast.success('User deleted successfully');
      setUserDeleteOpen(false);
      fetchTransporterUsers(selectedTransporter.id);
      fetchTransporters();
    } catch (error) {
      toast.error('Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Transporter name is required');
      return;
    }
    setSaving(true);
    try {
      if (selectedItem) {
        await transportersApi.update(selectedItem.id, formData);
        toast.success('Transporter updated successfully');
      } else {
        await transportersApi.create(formData);
        toast.success('Transporter created successfully');
      }
      setModalOpen(false);
      fetchTransporters();
    } catch (error) {
      toast.error('Failed to save transporter');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await transportersApi.delete(selectedItem.id);
      toast.success('Transporter deleted successfully');
      setDeleteOpen(false);
      fetchTransporters();
    } catch (error) {
      toast.error('Failed to delete transporter');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(importApi.getTemplate('transporters'), '_blank');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const response = await importApi.bulkImport('transporters', file);
      const { imported, errors, total_errors } = response.data;
      
      if (imported > 0) {
        toast.success(`Successfully imported ${imported} transporters`);
        fetchTransporters();
      }
      
      if (total_errors > 0) {
        toast.error(`${total_errors} rows had errors`);
        errors.forEach(err => console.error(err));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const industryOptions = ['Cement', 'Iron and Steel', 'FMCG', 'Construction', 'Agriculture', 'Chemicals', 'Other'];

  // Custom actions for DataTable with Manage Users button
  const customActions = (item) => (
    <div className="flex items-center gap-1">
      {canViewTransporterUsers && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleManageUsers(item)}
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
        >
          <Users className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  return (
    <PageLayout
      title="Transporters"
      subtitle="Manage transport companies"
      actions={
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>
          <Button variant="outline" onClick={handleImportClick} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Importing...' : 'Import Excel'}
          </Button>
          <Can action="create_transporter">
            <Button onClick={handleAdd} className="bg-slate-900 hover:bg-slate-800" data-testid="add-transporter-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Transporter
            </Button>
          </Can>
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={transporters}
        loading={loading}
        onEdit={hasActionPermission('update_transporter') ? handleEdit : undefined}
        onDelete={hasActionPermission('delete_transporter') ? handleDelete : undefined}
        customActions={customActions}
        emptyMessage="No transporters found. Add your first transporter!"
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedItem ? 'Edit Transporter' : 'Add Transporter'}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Transporter Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter transporter name"
              data-testid="transporter-name-input"
            />
          </div>
          <div>
            <Label htmlFor="trade_name">Trade Name</Label>
            <Input
              id="trade_name"
              value={formData.trade_name}
              onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
              placeholder="Trade name"
            />
          </div>
          <div>
            <Label htmlFor="contact_person_name">Contact Person</Label>
            <Input
              id="contact_person_name"
              value={formData.contact_person_name}
              onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
              placeholder="Contact person name"
            />
          </div>
          <div>
            <Label htmlFor="mobile_number">Mobile Number</Label>
            <Input
              id="mobile_number"
              value={formData.mobile_number}
              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
              placeholder="+91 XXXXXXXXXX"
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <Label htmlFor="gst_number">GST Number</Label>
            <Input
              id="gst_number"
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              placeholder="GST Number"
              className="mono"
            />
          </div>
          <div>
            <Label htmlFor="industry_type">Industry Type</Label>
            <Select
              value={formData.industry_type}
              onValueChange={(value) => setFormData({ ...formData, industry_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industryOptions.map((industry) => (
                  <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full address"
              rows={2}
            />
          </div>
        </div>
      </FormModal>

      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Transporter"
        description={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
        loading={saving}
      />

      {/* Users Management Modal */}
      {usersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Users - {selectedTransporter?.name}
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage users for this transporter</p>
              </div>
              <div className="flex items-center gap-2">
                {canCreateTransporterUsers && (
                  <Button onClick={handleAddUser} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-1" />
                    Add User
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setUsersModalOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 overflow-y-auto max-h-[calc(90vh-100px)]">
              {loadingUsers ? (
                <div className="text-center py-8 text-gray-500">Loading users...</div>
              ) : transporterUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No users added yet</p>
                  <p className="text-sm">Click "Add User" to add users to this transporter</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {transporterUsers.map((user) => (
                    <Card key={user.id} className="border hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              {user.title && <p className="text-sm text-gray-500">{user.title}</p>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {canUpdateTransporterUsers && (
                              <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                                <Edit className="w-4 h-4 text-gray-500" />
                              </Button>
                            )}
                            {canDeleteTransporterUsers && (
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(user)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 space-y-1 text-sm">
                          {user.mobile_number && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="w-3 h-3" />
                              {user.mobile_number}
                            </div>
                          )}
                          {user.email && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Mail className="w-3 h-3" />
                              {user.email}
                            </div>
                          )}
                          {(user.city || user.state) && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-3 h-3" />
                              {[user.city, user.state].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Form Modal */}
      <FormModal
        open={userFormOpen}
        onClose={() => setUserFormOpen(false)}
        title={selectedUser ? 'Edit User' : 'Add User'}
        onSubmit={handleSubmitUser}
        loading={saving}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Name *</Label>
            <Input
              value={userFormData.name}
              onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div>
            <Label>Title/Designation</Label>
            <Input
              value={userFormData.title}
              onChange={(e) => setUserFormData({ ...userFormData, title: e.target.value })}
              placeholder="e.g., Manager, Driver"
            />
          </div>
          <div>
            <Label>Mobile Number</Label>
            <Input
              value={userFormData.mobile_number}
              onChange={(e) => setUserFormData({ ...userFormData, mobile_number: e.target.value })}
              placeholder="+91 XXXXXXXXXX"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>
          <div>
            <Label>WhatsApp Number</Label>
            <Input
              value={userFormData.whatsapp_number}
              onChange={(e) => setUserFormData({ ...userFormData, whatsapp_number: e.target.value })}
              placeholder="WhatsApp number"
            />
          </div>
          <div>
            <Label>Emergency Contact</Label>
            <Input
              value={userFormData.emergency_contact}
              onChange={(e) => setUserFormData({ ...userFormData, emergency_contact: e.target.value })}
              placeholder="Emergency contact"
            />
          </div>
          <div>
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={userFormData.date_of_birth}
              onChange={(e) => setUserFormData({ ...userFormData, date_of_birth: e.target.value })}
            />
          </div>
          <div>
            <Label>Marital Status</Label>
            <Select
              value={userFormData.marital_status}
              onValueChange={(value) => setUserFormData({ ...userFormData, marital_status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Single">Single</SelectItem>
                <SelectItem value="Married">Married</SelectItem>
                <SelectItem value="Divorced">Divorced</SelectItem>
                <SelectItem value="Widowed">Widowed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Address</Label>
            <Textarea
              value={userFormData.address}
              onChange={(e) => setUserFormData({ ...userFormData, address: e.target.value })}
              placeholder="Full address"
              rows={2}
            />
          </div>
          <div>
            <Label>City</Label>
            <Input
              value={userFormData.city}
              onChange={(e) => setUserFormData({ ...userFormData, city: e.target.value })}
              placeholder="City"
            />
          </div>
          <div>
            <Label>District</Label>
            <Input
              value={userFormData.district}
              onChange={(e) => setUserFormData({ ...userFormData, district: e.target.value })}
              placeholder="District"
            />
          </div>
          <div>
            <Label>State</Label>
            <Select
              value={userFormData.state}
              onValueChange={(value) => setUserFormData({ ...userFormData, state: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {indianStates.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>PIN Code</Label>
            <Input
              value={userFormData.pin_code}
              onChange={(e) => setUserFormData({ ...userFormData, pin_code: e.target.value })}
              placeholder="PIN code"
            />
          </div>
          <div>
            <Label>PAN Number</Label>
            <Input
              value={userFormData.pan_number}
              onChange={(e) => setUserFormData({ ...userFormData, pan_number: e.target.value })}
              placeholder="PAN number"
              className="mono uppercase"
            />
          </div>
          <div>
            <Label>Aadhaar Number</Label>
            <Input
              value={userFormData.aadhaar_number}
              onChange={(e) => setUserFormData({ ...userFormData, aadhaar_number: e.target.value })}
              placeholder="Aadhaar number"
              className="mono"
            />
          </div>
          <div className="col-span-2">
            <Label>Remarks</Label>
            <Textarea
              value={userFormData.remarks}
              onChange={(e) => setUserFormData({ ...userFormData, remarks: e.target.value })}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </div>
      </FormModal>

      {/* User Delete Dialog */}
      <DeleteDialog
        open={userDeleteOpen}
        onClose={() => setUserDeleteOpen(false)}
        onConfirm={handleConfirmDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete "${selectedUser?.name}" from this transporter? This action cannot be undone.`}
        loading={saving}
      />
    </PageLayout>
  );
}
