import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable } from '../components/shared/DataTable';
import { FormModal } from '../components/shared/FormModal';
import { DeleteDialog } from '../components/shared/DeleteDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { railwaySidingsApi, railwayZonesApi } from '../lib/api';
import { toast } from 'sonner';
import { Plus, Train } from 'lucide-react';
import { Can } from '../components/Can';
import { usePermissions } from '../lib/permissions';

const columns = [
  { key: 'siding_name', label: 'Siding Name' },
  { key: 'siding_code', label: 'Siding Code', render: (v) => <span className="mono font-medium text-blue-600">{v}</span> },
  { key: 'station_name', label: 'Station' },
  { key: 'zone', label: 'Zone' },
  { key: 'division', label: 'Division' },
  { key: 'state', label: 'State' },
  { key: 'contact_person_name', label: 'Contact Person' },
  { key: 'contact_mobile', label: 'Contact Mobile' },
];

export default function RailwaySidings() {
  const [sidings, setSidings] = useState([]);
  const [divisionMapping, setDivisionMapping] = useState({});
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    siding_name: '',
    siding_code: '',
    division: '',
    zone: '',
    hq: '',
    station_name: '',
    state: '',
    contact_person_name: '',
    contact_mobile: '',
    remarks: '',
  });

  useEffect(() => {
    loadZones();
    fetchSidings();
  }, []);

  const loadZones = async () => {
    try {
      const res = await railwayZonesApi.getAll();
      const zonesFromApi = res.data || [];
      const mapping = {};
      zonesFromApi.forEach((zone) => {
        const divisionsText = zone.divisionsAllotted || '';
        divisionsText.split(',').forEach((division) => {
          const divisionName = division.trim();
          if (!divisionName) return;
          mapping[divisionName] = {
            zone: zone.railwayZone || zone.zoneCode || '',
            hq: zone.headquarters || ''
          };
        });
      });
      const sortedDivisions = Object.keys(mapping).sort();
      setDivisionMapping(mapping);
      setDivisions(sortedDivisions);
    } catch (error) {
      console.error('Failed to load railway zones', error);
      toast.error('Unable to load Railway Zones');
    }
  };

  const fetchSidings = async () => {
    try {
      const res = await railwaySidingsApi.getAll();
      setSidings(res.data);
    } catch (error) {
      toast.error('Failed to load railway sidings');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setFormData({
      siding_name: '',
      siding_code: '',
      division: '',
      zone: '',
      hq: '',
      station_name: '',
      state: '',
      contact_person_name: '',
      contact_mobile: '',
      remarks: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      siding_name: item.siding_name || '',
      siding_code: item.siding_code || '',
      division: item.division || '',
      zone: item.zone || '',
      hq: item.hq || '',
      station_name: item.station_name || '',
      state: item.state || '',
      contact_person_name: item.contact_person_name || '',
      contact_mobile: item.contact_mobile || '',
      remarks: item.remarks || '',
    });
    setModalOpen(true);
  };

  const handleDivisionChange = (selectedDivision) => {
    const zoneInfo = divisionMapping[selectedDivision] || {};
    setFormData({
      ...formData,
      division: selectedDivision,
      zone: zoneInfo.zone || '',
      hq: zoneInfo.hq || ''
    });
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.siding_name || !formData.siding_code) {
      toast.error('Siding Name and Code are required');
      return;
    }
    setSaving(true);
    try {
      if (selectedItem) {
        await railwaySidingsApi.update(selectedItem.id, formData);
        toast.success('Railway Siding updated successfully');
      } else {
        await railwaySidingsApi.create(formData);
        toast.success('Railway Siding created successfully');
      }
      setModalOpen(false);
      fetchSidings();
    } catch (error) {
      toast.error('Failed to save railway siding');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await railwaySidingsApi.delete(selectedItem.id);
      toast.success('Railway Siding deleted successfully');
      setDeleteOpen(false);
      fetchSidings();
    } catch (error) {
      toast.error('Failed to delete railway siding');
    } finally {
      setSaving(false);
    }
  };

  const { hasActionPermission } = usePermissions();

  return (
    <PageLayout
      title="Railway Sidings"
      subtitle="Manage railway siding points for rake transportation"
      actions={
        <Can action="create_railway_siding">
          <Button onClick={handleAdd} className="bg-slate-900 hover:bg-slate-800" data-testid="add-siding-btn">
            <Plus className="w-4 h-4 mr-2" />
            Add Siding
          </Button>
        </Can>
      }
    >
      <DataTable
        columns={columns}
        data={sidings}
        loading={loading}
        onEdit={hasActionPermission('update_railway_siding') ? handleEdit : undefined}
        onDelete={hasActionPermission('delete_railway_siding') ? handleDelete : undefined}
        emptyIcon={Train}
        emptyMessage="No railway sidings found. Add your first siding!"
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedItem ? 'Edit Railway Siding' : 'Add Railway Siding'}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="siding_name">Siding Name *</Label>
              <Input
                id="siding_name"
                value={formData.siding_name}
                onChange={(e) => setFormData({ ...formData, siding_name: e.target.value })}
                placeholder="Enter siding name"
                data-testid="siding-name-input"
              />
            </div>
            <div>
              <Label htmlFor="siding_code">Siding Code *</Label>
              <Input
                id="siding_code"
                value={formData.siding_code}
                onChange={(e) => setFormData({ ...formData, siding_code: e.target.value.toUpperCase() })}
                placeholder="e.g., KGPV"
                className="mono"
                data-testid="siding-code-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="station_name">Railway Station</Label>
              <Input
                id="station_name"
                value={formData.station_name}
                onChange={(e) => setFormData({ ...formData, station_name: e.target.value })}
                placeholder="Nearest railway station"
              />
            </div>
            <div>
              <Label htmlFor="division">Division *</Label>
              <Select value={formData.division} onValueChange={handleDivisionChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((div) => (
                    <SelectItem key={div} value={div}>{div}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="zone">Railway Zone</Label>
              <Input
                id="zone"
                value={formData.zone}
                readOnly
                className="bg-gray-100 text-gray-700"
                placeholder="Zone will be auto-populated"
              />
            </div>
            <div>
              <Label htmlFor="hq">Headquarters</Label>
              <Input
                id="hq"
                value={formData.hq}
                readOnly
                className="bg-gray-100 text-gray-700"
                placeholder="HQ will be auto-populated"
              />
            </div>
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

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="contact_mobile">Contact Mobile</Label>
              <Input
                id="contact_mobile"
                value={formData.contact_mobile}
                onChange={(e) => setFormData({ ...formData, contact_mobile: e.target.value })}
                placeholder="+91 XXXXXXXXXX"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </div>
      </FormModal>

      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Railway Siding"
        description={`Are you sure you want to delete "${selectedItem?.siding_name}"? This action cannot be undone.`}
        loading={saving}
      />
    </PageLayout>
  );
}
