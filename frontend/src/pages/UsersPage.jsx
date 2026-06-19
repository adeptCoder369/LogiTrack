import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable } from '../components/shared/DataTable';
import { FormModal } from '../components/shared/FormModal';
import { DeleteDialog } from '../components/shared/DeleteDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { usersApi, companiesApi } from '../lib/api';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'title', label: 'Title' },
  { key: 'role_designation', label: 'Role' },
  { key: 'email', label: 'Email' },
  { key: 'mobile_number', label: 'Mobile' },
  { key: 'city', label: 'City' },
];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    role_designation: '',
    company_id: '',
    username: '',
    mobile_number: '',
    email: '',
    city: '',
    state: '',
    address: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersRes, companiesRes] = await Promise.all([
        usersApi.getAll(),
        companiesApi.getAll()
      ]);
      setUsers(usersRes.data);
      setCompanies(companiesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setFormData({
      name: '',
      title: '',
      role_designation: '',
      company_id: '',
      username: '',
      mobile_number: '',
      email: '',
      city: '',
      state: '',
      address: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      title: item.title || '',
      role_designation: item.role_designation || '',
      company_id: item.company_id || '',
      username: item.username || '',
      mobile_number: item.mobile_number || '',
      email: item.email || '',
      city: item.city || '',
      state: item.state || '',
      address: item.address || '',
    });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (selectedItem) {
        await usersApi.update(selectedItem.id, formData);
        toast.success('User updated successfully');
      } else {
        await usersApi.create(formData);
        toast.success('User created successfully');
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await usersApi.delete(selectedItem.id);
      toast.success('User deleted successfully');
      setDeleteOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const roleOptions = [
    'Admin',
    'Manager',
    'Driver',
    'Warehouse Staff',
    'Depot Manager',
    'Loader',
    'Checker',
  ];

  return (
    <PageLayout
      title="Users"
      subtitle="Manage system users"
      actions={
        <Button onClick={handleAdd} className="bg-slate-900 hover:bg-slate-800" data-testid="add-user-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      }
    >
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        emptyMessage="No users found. Add your first user!"
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedItem ? 'Edit User' : 'Add User'}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              data-testid="user-name-input"
            />
          </div>
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Mr., Ms."
            />
          </div>
          <div>
            <Label htmlFor="role_designation">Role</Label>
            <Select
              value={formData.role_designation}
              onValueChange={(value) => setFormData({ ...formData, role_designation: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="company_id">Company</Label>
            <Select
              value={formData.company_id}
              onValueChange={(value) => setFormData({ ...formData, company_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="Username"
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
            <Label htmlFor="mobile_number">Mobile Number</Label>
            <Input
              id="mobile_number"
              value={formData.mobile_number}
              onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
              placeholder="+91 XXXXXXXXXX"
            />
          </div>
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
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              placeholder="State"
            />
          </div>
        </div>
      </FormModal>

      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete User"
        description={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
        loading={saving}
      />
    </PageLayout>
  );
}
