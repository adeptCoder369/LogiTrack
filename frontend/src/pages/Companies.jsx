import { useState, useEffect, useRef } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable } from '../components/shared/DataTable';
import { FormModal } from '../components/shared/FormModal';
import { DeleteDialog } from '../components/shared/DeleteDialog';
import { FileUpload } from '../components/shared/FileUpload';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { companiesApi, importApi, getFileUrl } from '../lib/api';
import { validators, formatters } from '../lib/validation';
import { toast } from 'sonner';
import { Plus, Upload, Download, Users, Building2, X, Edit, Trash2, User, Phone, Mail, MapPin } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { usePermissions } from '../lib/permissions';
import { Can } from '../components/Can';

const columns = [
  {
    key: 'name',
    label: 'Company Name',
    render: (v, row) => (
      <div className="flex items-center gap-2">
        {row.logo_file_id && (
          <img
            src={getFileUrl(row.logo_file_id)}
            alt={v}
            className="w-8 h-8 rounded-full object-cover"
          />
        )}
        <span className="font-medium">{v}</span>
        {row.is_client && (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
            Client
          </span>
        )}
      </div>
    )
  },
  { key: 'trade_name', label: 'Trade Name' },
  { key: 'company_type', label: 'Type', render: (v) => (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${v === 'Vendor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
      {v || 'Client'}
    </span>
  )},
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'gst_number', label: 'GST Number', render: (v) => <span className="mono text-sm">{v || '-'}</span> },
  { key: 'primary_email', label: 'Email' },
  { key: 'telephone', label: 'Phone' },
  { 
    key: 'logo_file_id',
     label: 'Logo',
    render: (v) => v ? <img src={getFileUrl(v)} alt="Logo" className="w-6 h-6 rounded-full object-cover" /> : <span className="text-gray-400">No Logo</span>
    },
];

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Ladakh'
];

export default function Companies() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  // Company Users state
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [userDeleteOpen, setUserDeleteOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    trade_name: '',
    logo_file_id: null,
    location: '',
    city: '',
    district: '',
    state: '',
    country: 'India',
    pin_code: '',
    hsn_code: '',
    product_description: '',
    gst_applicability: '',
    gst_number: '',
    website: '',
    primary_email: '',
    secondary_email: '',
    address: '',
    landmark: '',
    emergency_contact: '',
    whatsapp_number: '',
    telephone: '',
    pan_number: '',
    bank_name: '',
    bank_account_number: '',
    ifsc_code: '',
    contact_person_name: '',
    contact_person_mobile: '',
    company_type: 'Client',
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
    other_country: '',
    pan_number: '',
    aadhaar_number: '',
    remarks: '',
  });

  const { user } = useAuth();
  const { hasPermission, hasActionPermission } = usePermissions();

  const canViewCompanies = hasPermission('Companies (View)');
  const canCreateCompanies = hasPermission('Companies (Create)');
  const canUpdateCompanies = hasPermission('Companies (Update)');
  const canDeleteCompanies = hasPermission('Companies (Delete)');

  const canViewUsers = hasPermission('Company Users (View)');
  const canCreateUsers = hasPermission('Company Users (Create)');
  const canUpdateUsers = hasPermission('Company Users (Update)');
  const canDeleteUsers = hasPermission('Company Users (Delete)');


  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await companiesApi.getAll();
      setCompanies(res.data);
    } catch (error) {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanyUsers = async (companyId) => {
    setLoadingUsers(true);
    try {
      const res = await companiesApi.getUsers(companyId);
      setCompanyUsers(res.data);
    } catch (error) {
      toast.error('Failed to load company users');
      setCompanyUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setFormData({
      name: '',
      trade_name: '',
      logo_file_id: null,
      location: '',
      city: '',
      district: '',
      state: '',
      country: 'India',
      pin_code: '',
      hsn_code: '',
      product_description: '',
      gst_applicability: '',
      gst_number: '',
      website: '',
      primary_email: '',
      secondary_email: '',
      address: '',
      landmark: '',
      emergency_contact: '',
      whatsapp_number: '',
      telephone: '',
      pan_number: '',
      bank_name: '',
      bank_account_number: '',
      ifsc_code: '',
      contact_person_name: '',
      contact_person_mobile: '',
      company_type: 'Client',
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      trade_name: item.trade_name || '',
      logo_file_id: item.logo_file_id || null,
      location: item.location || '',
      city: item.city || '',
      district: item.district || '',
      state: item.state || '',
      country: item.country || 'India',
      pin_code: item.pin_code || '',
      hsn_code: item.hsn_code || '',
      product_description: item.product_description || '',
      gst_applicability: item.gst_applicability || '',
      gst_number: item.gst_number || '',
      website: item.website || '',
      primary_email: item.primary_email || '',
      secondary_email: item.secondary_email || '',
      address: item.address || '',
      landmark: item.landmark || '',
      emergency_contact: item.emergency_contact || '',
      whatsapp_number: item.whatsapp_number || '',
      telephone: item.telephone || '',
      pan_number: item.pan_number || '',
      bank_name: item.bank_name || '',
      bank_account_number: item.bank_account_number || '',
      ifsc_code: item.ifsc_code || '',
      contact_person_name: item.contact_person_name || '',
      contact_person_mobile: item.contact_person_mobile || '',
      company_type: item.company_type || 'Client',
    });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  // Manage Users
  const handleManageUsers = (company) => {
    setSelectedCompany(company);
    fetchCompanyUsers(company.id);
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
      other_country: '',
      pan_number: '',
      aadhaar_number: '',
      remarks: '',
    });
    setUserFormOpen(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    // Determine if country is one of the preset options or "Other"
    const presetCountries = ['India', 'Nepal', 'Bangladesh', 'Bhutan'];
    const isPresetCountry = presetCountries.includes(user.country);

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
      country: isPresetCountry ? (user.country || 'India') : 'Other',
      other_country: isPresetCountry ? '' : (user.country || ''),
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

  const handleSubmit = async () => {
    // Validation
    const errors = [];

    if (!formData.name || !formData.name.trim()) {
      errors.push('Company name is required');
    }

    if (formData.primary_email) {
      const emailError = validators.email(formData.primary_email, 'Primary email');
      if (emailError) errors.push(emailError);
    }

    if (formData.secondary_email) {
      const emailError = validators.email(formData.secondary_email, 'Secondary email');
      if (emailError) errors.push(emailError);
    }

    if (formData.gst_number) {
      const gstError = validators.gst(formData.gst_number, 'GST number');
      if (gstError) errors.push(gstError);
    }

    if (formData.pan_number) {
      const panError = validators.pan(formData.pan_number, 'PAN number');
      if (panError) errors.push(panError);
    }

    if (formData.pin_code) {
      const pinError = validators.pincode(formData.pin_code, 'Pin code');
      if (pinError) errors.push(pinError);
    }

    if (formData.ifsc_code) {
      const ifscError = validators.ifsc(formData.ifsc_code, 'IFSC code');
      if (ifscError) errors.push(ifscError);
    }

    if (formData.bank_account_number) {
      const bankError = validators.bankAccount(formData.bank_account_number, 'Bank account number');
      if (bankError) errors.push(bankError);
    }

    if (formData.contact_person_mobile) {
      const mobileError = validators.mobile(formData.contact_person_mobile, 'Contact person mobile');
      if (mobileError) errors.push(mobileError);
    }

    if (formData.whatsapp_number) {
      const whatsappError = validators.mobile(formData.whatsapp_number, 'WhatsApp number');
      if (whatsappError) errors.push(whatsappError);
    }

    if (formData.emergency_contact) {
      const emergencyError = validators.mobile(formData.emergency_contact, 'Emergency contact');
      if (emergencyError) errors.push(emergencyError);
    }

    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    setSaving(true);
    if (selectedItem && !canUpdateCompanies) return;
    if (!selectedItem && !canCreateCompanies) return;
    try {
      if (selectedItem) {
        await companiesApi.update(selectedItem.id, formData);
        toast.success('Company updated successfully');
      } else {
        await companiesApi.create(formData);
        toast.success('Company created successfully');
      }
      setModalOpen(false);
      fetchCompanies();
    } catch (error) {
      toast.error('Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await companiesApi.delete(selectedItem.id);
      toast.success('Company deleted successfully');
      setDeleteOpen(false);
      fetchCompanies();
    } catch (error) {
      toast.error('Failed to delete company');
    } finally {
      setSaving(false);
    }
  };

  const handleUserSubmit = async () => {
    if (selectedUser && !canUpdateUsers) return;
    if (!selectedUser && !canCreateUsers) return;

    // Validation
    const errors = [];

    if (!userFormData.name || !userFormData.name.trim()) {
      errors.push('User name is required');
    }

    if (userFormData.country === 'Other' && !userFormData.other_country) {
      errors.push('Please enter the country name');
    }

    if (userFormData.mobile_number) {
      const mobileError = validators.mobile(userFormData.mobile_number, 'Mobile number');
      if (mobileError) errors.push(mobileError);
    }

    if (userFormData.email) {
      const emailError = validators.email(userFormData.email, 'Email');
      if (emailError) errors.push(emailError);
    }

    if (userFormData.whatsapp_number) {
      const whatsappError = validators.mobile(userFormData.whatsapp_number, 'WhatsApp number');
      if (whatsappError) errors.push(whatsappError);
    }

    if (userFormData.emergency_contact) {
      const emergencyError = validators.mobile(userFormData.emergency_contact, 'Emergency contact');
      if (emergencyError) errors.push(emergencyError);
    }

    if (userFormData.pan_number) {
      const panError = validators.pan(userFormData.pan_number, 'PAN number');
      if (panError) errors.push(panError);
    }

    if (userFormData.aadhaar_number) {
      const aadhaarError = validators.aadhaar(userFormData.aadhaar_number, 'Aadhaar number');
      if (aadhaarError) errors.push(aadhaarError);
    }

    if (userFormData.pin_code) {
      const pinError = validators.pincode(userFormData.pin_code, 'Pin code');
      if (pinError) errors.push(pinError);
    }

    if (userFormData.date_of_birth) {
      const dobError = validators.dateNotFuture(userFormData.date_of_birth, 'Date of birth');
      if (dobError) errors.push(dobError);
    }

    if (userFormData.marital_status === 'Married' && userFormData.date_of_anniversary) {
      const doaError = validators.dateNotFuture(userFormData.date_of_anniversary, 'Date of anniversary');
      if (doaError) errors.push(doaError);
    }

    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    // Prepare data - use other_country if "Other" is selected
    const submitData = {
      ...userFormData,
      country: userFormData.country === 'Other' ? userFormData.other_country : userFormData.country,
    };
    delete submitData.other_country; // Remove the temporary field

    setSaving(true);
    try {
      if (selectedUser) {
        await companiesApi.updateUser(selectedCompany.id, selectedUser.id, submitData);
        toast.success('User updated successfully');
      } else {
        await companiesApi.addUser(selectedCompany.id, submitData);
        toast.success('User added successfully');
      }
      setUserFormOpen(false);
      fetchCompanyUsers(selectedCompany.id);
    } catch (error) {
      toast.error('Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    setSaving(true);
    try {
      await companiesApi.deleteUser(selectedCompany.id, selectedUser.id);
      toast.success('User deleted successfully');
      setUserDeleteOpen(false);
      fetchCompanyUsers(selectedCompany.id);
    } catch (error) {
      toast.error('Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    window.open(importApi.getTemplate('companies'), '_blank');
    toast.success('Template download started');
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);

    try {
      const res = await importApi.bulkImport('companies', file);
      toast.success(`Imported ${res.data.imported} companies successfully`);
      if (res.data.errors?.length) {
        toast.error(res.data.errors.slice(0, 5).join('\n'));
      }
      fetchCompanies();
    } catch (error) {
      const detail = error.response?.data?.detail;
      let message = 'Failed to import companies';
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail
          .map((d) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d)))
          .join('; ');
      }
      toast.error(message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Custom actions for data table - add "Manage Users" button
  const customActions = (item) => {
    if (!canViewUsers) return null;

    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => handleManageUsers(item)}
        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
      >
        <Users className="w-4 h-4 mr-1" />
        Users
      </Button>
    );
  };


  return (
    <PageLayout
      title="Companies"
      subtitle="Manage company records and their associated users"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Importing...' : 'Import Excel'}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx,.xls"
            onChange={handleImport}
          />
          <Can action="create_company">
            <Button onClick={handleAdd} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          </Can>

        </div>
      }
    >
      <DataTable
        columns={columns}
        data={companies}
        loading={loading}
        onEdit={hasActionPermission('update_company') ? handleEdit : undefined}
        onDelete={hasActionPermission('delete_company') ? handleDelete : undefined}
        customActions={customActions}
        emptyMessage="No companies found. Add your first company!"
      />

      {/* Company Form Modal */}
      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedItem ? 'Edit Company' : 'Add Company'}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter company name"
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company Logo</Label>
                <FileUpload
                  value={formData.logo_file_id}
                  onChange={(fileId) => setFormData({ ...formData, logo_file_id: fileId })}
                  accept="image/*"
                  showCameraOption={false}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Full address"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="landmark">Landmark</Label>
                <Input
                  id="landmark"
                  value={formData.landmark}
                  onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                  placeholder="Nearby landmark"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="District"
                />
              </div>
              <div>
                <Label>State</Label>
                {formData.country.toLowerCase() === 'india' ? (
                  <Select value={formData.state} onValueChange={(v) => setFormData({ ...formData, state: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {indianStates.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Enter state name"
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pin_code">PIN Code</Label>
                <Input
                  id="pin_code"
                  value={formData.pin_code}
                  onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
                  placeholder="PIN code"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Country"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_email">Primary Email</Label>
                <Input
                  id="primary_email"
                  type="email"
                  value={formData.primary_email}
                  onChange={(e) => setFormData({ ...formData, primary_email: e.target.value })}
                  placeholder="primary@example.com"
                />
              </div>
              <div>
                <Label htmlFor="secondary_email">Secondary Email</Label>
                <Input
                  id="secondary_email"
                  type="email"
                  value={formData.secondary_email}
                  onChange={(e) => setFormData({ ...formData, secondary_email: e.target.value })}
                  placeholder="secondary@example.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telephone">Telephone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  placeholder="Telephone number"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp_number">WhatsApp Number</Label>
                <Input
                  id="whatsapp_number"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  placeholder="WhatsApp number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_person_name">Contact Person Name</Label>
                <Input
                  id="contact_person_name"
                  value={formData.contact_person_name}
                  onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <Label htmlFor="contact_person_mobile">Contact Person Mobile</Label>
                <Input
                  id="contact_person_mobile"
                  value={formData.contact_person_mobile}
                  onChange={(e) => setFormData({ ...formData, contact_person_mobile: e.target.value })}
                  placeholder="Contact mobile"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact">Emergency Contact</Label>
                <Input
                  id="emergency_contact"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="Emergency contact"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="www.example.com"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Company Type</Label>
                <Select value={formData.company_type} onValueChange={(v) => setFormData({ ...formData, company_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Client">Client</SelectItem>
                    <SelectItem value="Vendor">Vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="gst_number">GST Number</Label>
                <Input
                  id="gst_number"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                  placeholder="GSTIN"
                  className="mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="Bank name"
                />
              </div>
              <div>
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value })}
                  placeholder="Account number"
                  className="mono"
                />
              </div>
              <div>
                <Label htmlFor="ifsc_code">IFSC Code</Label>
                <Input
                  id="ifsc_code"
                  value={formData.ifsc_code}
                  onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                  placeholder="IFSC"
                  className="mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hsn_code">HSN Code</Label>
                <Input
                  id="hsn_code"
                  value={formData.hsn_code}
                  onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                  placeholder="HSN code"
                />
              </div>
              <div>
                <Label>GST Applicability</Label>
                <Select value={formData.gst_applicability} onValueChange={(v) => setFormData({ ...formData, gst_applicability: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Registered">Registered</SelectItem>
                    <SelectItem value="Unregistered">Unregistered</SelectItem>
                    <SelectItem value="Composition">Composition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </FormModal>

      {/* Company Users Modal */}
      {usersModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-purple-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{selectedCompany?.name}</h2>
                  <p className="text-sm text-gray-500">Manage company users</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setUsersModalOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  {companyUsers.length} user(s) associated with this company
                </p>
                {canCreateUsers && (
                  <Button onClick={handleAddUser} className="bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                )}
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-pulse text-gray-400">Loading users...</div>
                </div>
              ) : companyUsers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900">No Users Yet</h3>
                  <p className="text-gray-500 mb-4">Add users to this company to manage contacts.</p>
                  {canCreateUsers && (
                    <Button onClick={handleAddUser} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First User
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto">
                  {companyUsers.map((user) => (
                    <Card key={user.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-full">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium">{user.name}</h4>
                              {user.title && <p className="text-sm text-purple-600">{user.title}</p>}
                              {user.mobile_number && (
                                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                  <Phone className="w-3 h-3" /> {user.mobile_number}
                                </p>
                              )}
                              {user.email && (
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3" /> {user.email}
                                </p>
                              )}
                              {user.city && (
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> {user.city}{user.state && `, ${user.state}`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {canUpdateUsers && (
                              <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                                <Edit className="w-4 h-4 text-gray-500" />
                              </Button>
                            )}
                            {canDeleteUsers && (
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(user)}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User Form Modal */}
      <FormModal
        open={userFormOpen}
        onClose={() => setUserFormOpen(false)}
        title={selectedUser ? 'Edit User' : 'Add User'}
        onSubmit={handleUserSubmit}
        loading={saving}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user_name">Name *</Label>
              <Input
                id="user_name"
                value={userFormData.name}
                onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <Label htmlFor="user_title">Title/Designation</Label>
              <Input
                id="user_title"
                value={userFormData.title}
                onChange={(e) => setUserFormData({ ...userFormData, title: e.target.value })}
                placeholder="e.g., Manager, Director"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="user_dob">Date of Birth</Label>
              <Input
                id="user_dob"
                type="date"
                value={userFormData.date_of_birth}
                onChange={(e) => setUserFormData({ ...userFormData, date_of_birth: e.target.value })}
              />
            </div>
            <div>
              <Label>Marital Status</Label>
              <Select value={userFormData.marital_status} onValueChange={(v) => setUserFormData({ ...userFormData, marital_status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {userFormData.marital_status === 'Married' && (
              <div>
                <Label htmlFor="user_doa">Date of Anniversary</Label>
                <Input
                  id="user_doa"
                  type="date"
                  value={userFormData.date_of_anniversary}
                  onChange={(e) => setUserFormData({ ...userFormData, date_of_anniversary: e.target.value })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user_mobile">Mobile Number</Label>
              <Input
                id="user_mobile"
                value={userFormData.mobile_number}
                onChange={(e) => setUserFormData({ ...userFormData, mobile_number: e.target.value })}
                placeholder="+91 XXXXXXXXXX"
              />
            </div>
            <div>
              <Label htmlFor="user_email">Email</Label>
              <Input
                id="user_email"
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user_whatsapp">WhatsApp Number</Label>
              <Input
                id="user_whatsapp"
                value={userFormData.whatsapp_number}
                onChange={(e) => setUserFormData({ ...userFormData, whatsapp_number: e.target.value })}
                placeholder="WhatsApp number"
              />
            </div>
            <div>
              <Label htmlFor="user_emergency">Emergency Contact</Label>
              <Input
                id="user_emergency"
                value={userFormData.emergency_contact}
                onChange={(e) => setUserFormData({ ...userFormData, emergency_contact: e.target.value })}
                placeholder="Emergency contact"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="user_address">Address</Label>
            <Textarea
              id="user_address"
              value={userFormData.address}
              onChange={(e) => setUserFormData({ ...userFormData, address: e.target.value })}
              placeholder="Full address"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="user_city">City</Label>
              <Input
                id="user_city"
                value={userFormData.city}
                onChange={(e) => setUserFormData({ ...userFormData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="user_district">District</Label>
              <Input
                id="user_district"
                value={userFormData.district}
                onChange={(e) => setUserFormData({ ...userFormData, district: e.target.value })}
                placeholder="District"
              />
            </div>
            <div>
              <Label>State</Label>
              {userFormData.country === 'india' ? (
                <Select value={userFormData.state} onValueChange={(v) => setUserFormData({ ...userFormData, state: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {indianStates.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  id="user_state"
                  placeholder="Enter state name"
                  value={userFormData.state || ''}
                  onChange={(e) => setUserFormData({ ...userFormData, state: e.target.value })}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user_pin">PIN Code</Label>
              <Input
                id="user_pin"
                value={userFormData.pin_code}
                onChange={(e) => setUserFormData({ ...userFormData, pin_code: e.target.value })}
                placeholder="PIN code"
              />
            </div>
            <div>
              <Label>Country</Label>
              <Select value={userFormData.country} onValueChange={(v) => setUserFormData({ ...userFormData, country: v, other_country: v === 'Other' ? userFormData.other_country : '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="india">India</SelectItem>
                  <SelectItem value="Nepal">Nepal</SelectItem>
                  <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                  <SelectItem value="Bhutan">Bhutan</SelectItem>
                  <SelectItem value="Other">Any Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Show text input when "Any Other" country is selected */}
          {userFormData.country === 'Other' && (
            <div>
              <Label htmlFor="other_country">Specify Country Name *</Label>
              <Input
                id="other_country"
                value={userFormData.other_country}
                onChange={(e) => setUserFormData({ ...userFormData, other_country: e.target.value })}
                placeholder="Enter country name"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="user_pan">PAN Number</Label>
              <Input
                id="user_pan"
                value={userFormData.pan_number}
                onChange={(e) => setUserFormData({ ...userFormData, pan_number: e.target.value.toUpperCase() })}
                placeholder="PAN number"
                className="mono"
              />
            </div>
            <div>
              <Label htmlFor="user_aadhaar">Aadhaar Number</Label>
              <Input
                id="user_aadhaar"
                value={userFormData.aadhaar_number}
                onChange={(e) => setUserFormData({ ...userFormData, aadhaar_number: e.target.value.replace(/\D/g, '').slice(0, 12) })}
                placeholder="12-digit Aadhaar"
                maxLength={12}
                className="mono"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="user_remarks">Remarks</Label>
            <Textarea
              id="user_remarks"
              value={userFormData.remarks}
              onChange={(e) => setUserFormData({ ...userFormData, remarks: e.target.value })}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </div>
      </FormModal>

      {/* Delete Company Dialog */}
      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Company"
        description={`Are you sure you want to delete "${selectedItem?.name}"? This will also delete all associated users.`}
        loading={saving}
      />

      {/* Delete User Dialog */}
      <DeleteDialog
        open={userDeleteOpen}
        onClose={() => setUserDeleteOpen(false)}
        onConfirm={handleConfirmDeleteUser}
        title="Delete User"
        description={`Are you sure you want to delete "${selectedUser?.name}"?`}
        loading={saving}
      />
    </PageLayout>
  );
}
