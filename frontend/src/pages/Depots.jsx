import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { FormModal } from '../components/shared/FormModal';
import { DeleteDialog } from '../components/shared/DeleteDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { depotsApi, usersApi, companiesApi, regionsApi, locationsApi } from '../lib/api';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { DepotDataTable } from '@/components/depots/DataTable';
import { Checkbox } from '../components/ui/checkbox';
import { Can } from '../components/Can';
import { usePermissions } from '../lib/permissions';

// columns defined inside component to access `users` for rendering assigned user names

export default function Depots() {
  const [depots, setDepots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [regions, setRegions] = useState([]);
  const [locations, setLocations] = useState([]);
  const columns = [
    { key: 'name', label: 'Depot Name' },
    {
      key: 'company_id',
      label: 'Owning Company',
      render: (v) => {
        if (!v) return <span className="text-slate-400">Unassigned</span>;
        const company = companies.find((c) => c.id === v);
        return company ? company.name : v;
      },
    },
    { key: 'city', label: 'City' },
    { key: 'state', label: 'State' },
    { key: 'warehouse_type', label: 'Type' },
    { key: 'storage_capacity', label: 'Capacity', render: (v) => v ? `${v} MT` : '-' },
    { key: 'current_occupancy', label: 'Occupancy', render: (v) => v ? `${v}%` : '0%' },
    { key: 'contact_person_name', label: 'Contact Person' },
    {
      key: 'assigned_roles',
      label: 'Assigned Roles',
      render: (v) => (v && v.length ? (
        <div className="flex flex-wrap gap-1">
          {v.map((r) => (
            <span key={r} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{r}</span>
          ))}
        </div>
      ) : '-'),
    },
    {
      key: 'assigned_users',
      label: 'Assigned Users',
      render: (_, row) => {
        const roleUserIds = (row.assigned_roles || []).flatMap((role) => users.filter((u) => u.role === role).map((u) => u.id));
        const explicitUserIds = users.filter((u) => (u.assigned_depots || []).includes(row.id)).map((u) => u.id);
        const allIds = Array.from(new Set([...explicitUserIds, ...roleUserIds]));
        return allIds.length ? (
          <div className="flex flex-wrap gap-1">
            {allIds.map((id) => {
              const user = users.find((u) => u.id === id);
              return (
                <span key={id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  {user ? `${user.name}` : id}
                </span>
              );
            })}
          </div>
        ) : '-';
      }
    }
  ];
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company_id: '',
    location_id: '',
    location: '',
    city: '',
    district: '',
    state: '',
    country: 'India',
    pin_code: '',
    address: '',
    landmark: '',
    contact_person_name: '',
    contact_mobile: '',
    contact_email: '',
    storage_capacity: '',
    current_occupancy: '',
    warehouse_type: '',
    operational_hours: '',
    // assignment
    assigned_roles: ['Management'],
  });

  useEffect(() => {
    fetchDepots();
  }, []);

  const fetchDepots = async () => {
    try {
      const res = await depotsApi.getAll();
      setDepots(res.data);
      try {
        const ures = await usersApi.getAll();
        setUsers(ures.data || []);
      } catch (e) {
        // ignore
      }
      try {
        const cres = await companiesApi.getAll();
        setCompanies(cres.data || []);
      } catch (e) {
        // ignore
      }
      try {
        const [regionsRes, locationsRes] = await Promise.all([
          regionsApi.getAll(),
          locationsApi.getAll()
        ]);
        setRegions(regionsRes.data || []);
        setLocations(locationsRes.data || []);
      } catch (e) {
        // ignore
      }
    } catch (error) {
      toast.error('Failed to load depots');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setFormData({
      name: '',
      company_id: '',
      location_id: '',
      location: '',
      city: '',
      district: '',
      state: '',
      country: 'India',
      pin_code: '',
      address: '',
      landmark: '',
      contact_person_name: '',
      contact_mobile: '',
      contact_email: '',
      storage_capacity: '',
      current_occupancy: '',
      warehouse_type: '',
      operational_hours: '',
      assigned_roles: [],
      assigned_user_ids: [],
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      name: item.name || '',
      company_id: item.company_id || '',
      location_id: item.location_id || '',
      location: item.location || '',
      city: item.city || '',
      district: item.district || '',
      state: item.state || '',
      country: item.country || 'India',
      pin_code: item.pin_code || '',
      address: item.address || '',
      landmark: item.landmark || '',
      contact_person_name: item.contact_person_name || '',
      contact_mobile: item.contact_mobile || '',
      contact_email: item.contact_email || '',
      storage_capacity: item.storage_capacity || '',
      current_occupancy: item.current_occupancy || '',
      warehouse_type: item.warehouse_type || '',
      operational_hours: item.operational_hours || '',
      assigned_roles: [...new Set([...item.assigned_roles || [], 'Management'])],
    });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error('Depot name is required');
      return;
    }
    if (!formData.company_id) {
      toast.error('A depot must belong to a company — select the owning company');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        assigned_roles: [...new Set([...formData.assigned_roles, 'Management'])],
        storage_capacity: formData.storage_capacity ? parseFloat(formData.storage_capacity) : null,
        current_occupancy: formData.current_occupancy ? parseFloat(formData.current_occupancy) : 0,
      };
      let depotId = selectedItem ? selectedItem.id : null;
      if (selectedItem) {
        await depotsApi.update(selectedItem.id, payload);
        depotId = selectedItem.id;
        toast.success('Depot updated successfully');
      } else {
        const res = await depotsApi.create(payload);
        depotId = res.data.id;
        toast.success('Depot created successfully');
      }
      setModalOpen(false);
      fetchDepots();
    } catch (error) {
      toast.error('Failed to save depot');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await depotsApi.delete(selectedItem.id);
      toast.success('Depot deleted successfully');
      setDeleteOpen(false);
      fetchDepots();
    } catch (error) {
      toast.error('Failed to delete depot');
    } finally {
      setSaving(false);
    }
  };

  const { hasActionPermission } = usePermissions();
  const warehouseTypes = ['General', 'Cold Storage', 'Open Yard', 'Covered', 'Bonded'];
  const roles = ['Admin', 'Management', 'Loader', 'Weightment', 'Dispatch Verifier', 'Depot Supervisor', 'Depot Staff'];

  return (
    <PageLayout
      title="Depots"
      subtitle="Manage warehouses and depots"
      actions={
        <Can action="create_depot">
          <Button onClick={handleAdd} className="bg-brand hover:bg-brand/90" data-testid="add-depot-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Depot
          </Button>
        </Can>
      }
    >
      <DepotDataTable
        columns={columns}
        data={depots}
        loading={loading}
        onEdit={hasActionPermission('update_depot') ? handleEdit : undefined}
        onDelete={hasActionPermission('delete_depot') ? handleDelete : undefined}
        emptyMessage="No depots found. Add your first depot!"
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedItem ? 'Edit Depot' : 'Add Depot'}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Depot Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter depot name"
              data-testid="depot-name-input"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="company_id">Owning Company *</Label>
            <Select
              value={formData.company_id}
              onValueChange={(value) => setFormData({ ...formData, company_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1">Legacy depots without an owner can be assigned here.</p>
          </div>
          <div className="col-span-2">
            <Label htmlFor="location_id">Location</Label>
            <Select
              value={formData.location_id}
              onValueChange={(value) => {
                const loc = locations.find((l) => l.id === value);
                const region = regions.find((r) => r.id === loc?.region_id);
                setFormData({
                  ...formData,
                  location_id: value,
                  location: loc ? (region ? `${region.name} — ${loc.name}` : loc.name) : ''
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select location (optional)" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((l) => {
                  const region = regions.find((r) => r.id === l.region_id);
                  return (
                    <SelectItem key={l.id} value={l.id}>
                      {region ? `${region.name} — ${l.name}` : l.name}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1">Part of the Region → Location → Depot hierarchy.</p>
          </div>
          <div>
            <Label htmlFor="warehouse_type">Warehouse Type</Label>
            <Select
              value={formData.warehouse_type}
              onValueChange={(value) => setFormData({ ...formData, warehouse_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {warehouseTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div>
            <Label htmlFor="pin_code">PIN Code</Label>
            <Input
              id="pin_code"
              value={formData.pin_code}
              onChange={(e) => setFormData({ ...formData, pin_code: e.target.value })}
              placeholder="PIN Code"
            />
          </div>
          <div>
            <Label htmlFor="storage_capacity">Storage Capacity (MT)</Label>
            <Input
              id="storage_capacity"
              type="number"
              step="0.001"
              value={formData.storage_capacity}
              onChange={(e) => setFormData({ ...formData, storage_capacity: e.target.value })}
              placeholder="Total capacity"
            />
          </div>
          <div>
            <Label htmlFor="current_occupancy">Current Occupancy (%)</Label>
            <Input
              id="current_occupancy"
              type="number"
              step="0.1"
              value={formData.current_occupancy}
              onChange={(e) => setFormData({ ...formData, current_occupancy: e.target.value })}
              placeholder="Occupancy %"
            />
          </div>
          <div>
            <Label htmlFor="contact_person_name">Contact Person</Label>
            <Input
              id="contact_person_name"
              value={formData.contact_person_name}
              onChange={(e) => setFormData({ ...formData, contact_person_name: e.target.value })}
              placeholder="Contact name"
            />
          </div>
          <div>
            <Label htmlFor="contact_mobile">Contact Mobile</Label>
            <Input
              id="contact_mobile"
              value={formData.contact_mobile}
              onChange={(e) => setFormData({ ...formData, contact_mobile: e.target.value })}
              placeholder="+91 XXXXXXXXXX"
            />
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
        title="Delete Depot"
        description={`Are you sure you want to delete "${selectedItem?.name}"? This action cannot be undone.`}
        loading={saving}
      />
    </PageLayout>
  );
}
