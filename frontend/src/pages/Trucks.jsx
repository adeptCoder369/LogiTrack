import { useState, useEffect, useRef } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable } from '../components/shared/DataTable';
import { FormModal } from '../components/shared/FormModal';
import { DeleteDialog } from '../components/shared/DeleteDialog';
import { StatusBadge } from '../components/shared/StatusBadge';
import { FileUpload, MultiPhotoUpload } from '../components/shared/FileUpload';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { trucksApi, transportersApi, importApi, getFileUrl } from '../lib/api';
import { validators, formatters } from '../lib/validation';
import { toast } from 'sonner';
import { Plus, Upload, Download, Search, X, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { Can } from '../components/Can';
import { usePermissions } from '../lib/permissions';

// Helper to format vehicle number for display
const formatVehicleNumber = (value) => formatters.vehicleNumberDisplay(value);

export default function Trucks() {
  const { hasActionPermission } = usePermissions();
  const [trucks, setTrucks] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  
  // Vehicle number search state
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [formData, setFormData] = useState({
    vehicle_number: '',
    transporter_id: '',
    capacity_mt: '',
    tare_weight_mt: '',
    make_model: '',
    year_of_manufacture: '',
    insurance_expiry: '',
    puc_expiry: '',
    driver_name: '',
    driver_mobile: '',
    helper_name: '',
    helper_mobile: '',
    current_status: 'Idle',
    photos: [],  // Array of photos (up to 5)
  });
  const [viewOpen, setViewOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

    
    const columns = [
      { 
        key: 'vehicle_number', 
        label: 'Vehicle No.', 
        render: (v) => (
          <span className="mono font-medium tracking-wider">
            {formatVehicleNumber(v)}
          </span>
        )
      },

      // ✅ NEW: Transporter
      { 
        key: 'transporter_name', 
        label: 'Transporter',
        render: (v, row) => {
          const transporter = transporters.find(t => t.id === row.transporter_id);
          return transporter?.name || '-';
        }
      },

      // ✅ EXISTING DRIVER (improved)
      { 
        key: 'drivers', 
        label: 'Driver',
        render: (v, row) => {
          const drivers = v || [];
          const primary = drivers.find(d => d.is_primary) || {};
          return (
            <div className="text-sm">
              <p className="font-medium">{primary.name || row.driver_name || '-'}</p>
              {primary.mobile && (
                <p className="text-xs text-gray-500">{primary.mobile}</p>
              )}
            </div>
          );
        }
      },

      // ✅ NEW: Year of Manufacture
      { 
        key: 'year_of_manufacture', 
        label: 'Year',
        render: (v) => v || '-'
      },

      { key: 'capacity_mt', label: 'Capacity (MT)', render: (v) => v ? `${v} MT` : '-' },
      { key: 'tare_weight_mt', label: 'Tare Weight', render: (v) => v ? `${v} MT` : '-' },

      { key: 'make_model', label: 'Make/Model' },

      { 
        key: 'current_status', 
        label: 'Status', 
        render: (v) => <StatusBadge status={v || 'Idle'} /> 
      }
    ];

  const fetchData = async () => {
    try {
      const [trucksRes, transportersRes] = await Promise.all([
        trucksApi.getAll(),
        transportersApi.getAll()
      ]);
      setTrucks(trucksRes.data);
      setTransporters(transportersRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setVehicleSearch('');
    setVehicleDropdownOpen(false);
    setFormData({
      vehicle_number: '',
      transporter_id: '',
      capacity_mt: '',
      tare_weight_mt: '',
      make_model: '',
      year_of_manufacture: '',
      insurance_expiry: '',
      puc_expiry: '',
      driver_name: '',
      driver_mobile: '',
      helper_name: '',
      helper_mobile: '',
      current_status: 'Idle',
      photos: [],
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setVehicleSearch(item.vehicle_number || '');
    setVehicleDropdownOpen(false);
    // Convert old format (front_photo, back_photo) to new format (photos array)
    let photos = item.photos || [];
    if (!Array.isArray(photos) || photos.length === 0) {
      // Migrate old data format
      if (item.front_photo) photos.push(item.front_photo);
      if (item.back_photo) photos.push(item.back_photo);
    }
    
    setFormData({
      vehicle_number: item.vehicle_number || '',
      transporter_id: item.transporter_id || '',
      capacity_mt: item.capacity_mt || '',
      tare_weight_mt: item.tare_weight_mt || '',
      make_model: item.make_model || '',
      year_of_manufacture: item.year_of_manufacture || '',
      insurance_expiry: item.insurance_expiry || '',
      puc_expiry: item.puc_expiry || '',
      driver_name: item.driver_name || '',
      driver_mobile: item.driver_mobile || '',
      helper_name: item.helper_name || '',
      helper_mobile: item.helper_mobile || '',
      current_status: item.current_status || 'Idle',
      photos: photos,
    });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };
  
  const handleView = (row) => {
    setViewItem(row);
    setViewOpen(true);
  };

  // Filter trucks based on vehicle search query
  const filteredTrucks = trucks.filter(t => 
    t.vehicle_number?.toUpperCase().includes(vehicleSearch.toUpperCase().replace(/\s/g, ''))
  );

  // Check if exact match exists (excluding current item being edited)
  const exactMatchExists = trucks.some(t => 
    t.vehicle_number?.toUpperCase().replace(/\s/g, '') === vehicleSearch.toUpperCase().replace(/\s/g, '') &&
    (!selectedItem || t.id !== selectedItem.id)
  );

  // Check if vehicle number is valid format
  const isValidVehicleFormat = vehicleSearch.length >= 6 && /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/i.test(vehicleSearch.replace(/\s/g, ''));

  const handleSubmit = async () => {
    // Validation
    const errors = [];
    
    if (!formData.vehicle_number || !formData.vehicle_number.trim()) {
      errors.push('Vehicle number is required');
    } else {
      const vehicleError = validators.vehicleNumber(formData.vehicle_number, 'Vehicle number');
      if (vehicleError) errors.push(vehicleError);
      
      // Check for duplicate vehicle number
      if (exactMatchExists) {
        errors.push('This vehicle number already exists');
      }
    }
    
    if (formData.capacity_mt) {
      const capacityError = validators.positiveNumber(formData.capacity_mt, 'Capacity');
      if (capacityError) errors.push(capacityError);
    }
    
    if (formData.tare_weight_mt) {
      const tareError = validators.positiveNumber(formData.tare_weight_mt, 'Tare weight');
      if (tareError) errors.push(tareError);
    }
    
    if (formData.driver_mobile) {
      const mobileError = validators.mobile(formData.driver_mobile, 'Driver mobile');
      if (mobileError) errors.push(mobileError);
    }
    
    if (formData.helper_mobile) {
      const helperError = validators.mobile(formData.helper_mobile, 'Helper mobile');
      if (helperError) errors.push(helperError);
    }
    
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...formData,
        capacity_mt: formData.capacity_mt ? parseFloat(formData.capacity_mt) : null,
        tare_weight_mt: formData.tare_weight_mt ? parseFloat(formData.tare_weight_mt) : null,
        photos: (formData.photos || []).map(p => p.file_id || p)
      };
      if (selectedItem) {
        await trucksApi.update(selectedItem.id, payload);
        toast.success('Truck updated successfully');
      } else {
        await trucksApi.create(payload);
        toast.success('Truck created successfully');
      }
      setModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save truck');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await trucksApi.delete(selectedItem.id);
      toast.success('Truck deleted successfully');
      setDeleteOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete truck');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open(importApi.getTemplate('trucks'), '_blank');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const response = await importApi.bulkImport('trucks', file);
      const { imported, errors, total_errors } = response.data;
      
      if (imported > 0) {
        toast.success(`Successfully imported ${imported} trucks`);
        fetchData();
      }
      
      if (total_errors > 0) {
        toast.error(`${total_errors} rows had errors`);
        errors.forEach(err => console.error(err));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = ''; // Reset file input
    }
  };

  const statusOptions = ['Idle', 'On Trip', 'Maintenance'];
  

  return (
    <PageLayout
      title="Trucks"
      subtitle="Manage your fleet"
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
          <Can action="create_truck">
            <Button onClick={handleAdd} className="bg-slate-900 hover:bg-slate-800" data-testid="add-truck-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Truck
            </Button>
          </Can>
        </div>
      }
    >
      <DataTable
        columns={columns}
        data={trucks}
        loading={loading}
        onEdit={hasActionPermission('update_truck') ? handleEdit : undefined}
        onDelete={hasActionPermission('delete_truck') ? handleDelete : undefined}
        customActions={(row) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(row)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
        emptyMessage="No trucks found. Add your first truck!"
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedItem ? 'Edit Truck' : 'Add Truck'}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 relative">
            <Label htmlFor="vehicle_number">Vehicle Number *</Label>
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  id="vehicle_number"
                  value={vehicleSearch}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    setVehicleSearch(value);
                    setFormData({ ...formData, vehicle_number: value });
                    setVehicleDropdownOpen(true);
                  }}
                  onFocus={() => setVehicleDropdownOpen(true)}
                  placeholder="e.g., MH12AB1234"
                  className="pl-9 pr-8 mono tracking-wider"
                  data-testid="truck-number-input"
                />
                {vehicleSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleSearch('');
                      setFormData({ ...formData, vehicle_number: '' });
                    }}
                    className="absolute right-2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
              
              {/* Dropdown */}
              {vehicleDropdownOpen && vehicleSearch && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-auto">
                  {/* Duplicate warning */}
                  {exactMatchExists && (
                    <div className="px-3 py-2 bg-red-50 border-b flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-700 font-medium">
                        Vehicle "{formatVehicleNumber(vehicleSearch)}" already exists!
                      </span>
                    </div>
                  )}
                  
                  {/* Show matching vehicles */}
                  {filteredTrucks.length > 0 && !exactMatchExists && (
                    <>
                      <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                        Similar vehicles found ({filteredTrucks.length})
                      </div>
                      {filteredTrucks.slice(0, 5).map((truck) => (
                        <div
                          key={truck.id}
                          className="px-3 py-2 text-sm text-gray-600 flex items-center justify-between hover:bg-gray-50"
                        >
                          <span className="mono tracking-wider">{formatVehicleNumber(truck.vehicle_number)}</span>
                          <span className="text-xs text-gray-400">Existing</span>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* New vehicle indicator */}
                  {vehicleSearch && !exactMatchExists && isValidVehicleFormat && (
                    <div className="px-3 py-2 bg-green-50 border-t flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-700">
                        New vehicle: <span className="font-medium tracking-wider">{formatVehicleNumber(vehicleSearch)}</span>
                      </span>
                    </div>
                  )}
                  
                  {/* Close button */}
                  <div 
                    onClick={() => setVehicleDropdownOpen(false)}
                    className="px-3 py-1.5 text-xs text-center text-gray-500 bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                  >
                    Close
                  </div>
                </div>
              )}
            </div>
            
            {/* Status indicator below input */}
            {vehicleSearch && (
              <div className="mt-1">
                {exactMatchExists ? (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    This vehicle already exists. Please use a different number.
                  </p>
                ) : isValidVehicleFormat ? (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Valid format: {formatVehicleNumber(vehicleSearch)}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600">
                    Enter valid format: State(2) + District(2) + Series(0-3) + Number(1-4)
                  </p>
                )}
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="transporter_id">Transporter</Label>
            <Select
              value={formData.transporter_id}
              onValueChange={(value) => setFormData({ ...formData, transporter_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select transporter" />
              </SelectTrigger>
              <SelectContent>
                {transporters.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="current_status">Status</Label>
            <Select
              value={formData.current_status}
              onValueChange={(value) => setFormData({ ...formData, current_status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="capacity_mt">Capacity (MT)</Label>
            <Input
              id="capacity_mt"
              type="number"
              step="0.001"
              value={formData.capacity_mt}
              onChange={(e) => setFormData({ ...formData, capacity_mt: e.target.value })}
              placeholder="e.g., 25.5"
            />
          </div>
          <div>
            <Label htmlFor="tare_weight_mt">Tare Weight (MT)</Label>
            <Input
              id="tare_weight_mt"
              type="number"
              step="0.001"
              value={formData.tare_weight_mt}
              onChange={(e) => setFormData({ ...formData, tare_weight_mt: e.target.value })}
              placeholder="e.g., 12.0"
            />
          </div>
          <div>
            <Label htmlFor="make_model">Make/Model</Label>
            <Input
              id="make_model"
              value={formData.make_model}
              onChange={(e) => setFormData({ ...formData, make_model: e.target.value })}
              placeholder="e.g., Tata Prima"
            />
          </div>
          <div>
            <Label htmlFor="year_of_manufacture">Year of Manufacture</Label>
            <Input
              id="year_of_manufacture"
              value={formData.year_of_manufacture}
              onChange={(e) => setFormData({ ...formData, year_of_manufacture: e.target.value })}
              placeholder="e.g., 2020"
            />
          </div>
          <div>
            <Label htmlFor="driver_name">Driver Name</Label>
            <Input
              id="driver_name"
              value={formData.driver_name}
              onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
              placeholder="Driver name"
            />
          </div>
          <div>
            <Label htmlFor="driver_mobile">Driver Mobile</Label>
            <Input
              id="driver_mobile"
              value={formData.driver_mobile}
              onChange={(e) => setFormData({ ...formData, driver_mobile: e.target.value })}
              placeholder="+91 XXXXXXXXXX"
            />
          </div>
          <div className="col-span-2">
            <MultiPhotoUpload
              label="Truck Photos"
              value={formData.photos}
              onChange={(photos) => setFormData({ ...formData, photos })}
              maxPhotos={5}
            />
          </div>
        </div>
      </FormModal>
      
      
  <FormModal
  open={viewOpen}
  onClose={() => setViewOpen(false)}
  title={`Truck Details - ${viewItem?.vehicle_number}`}
  hideSubmit
    >
      {viewItem && (
        <div className="space-y-4">

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><b>Vehicle:</b> {viewItem.vehicle_number}</div>
            <div><b>Status:</b> {viewItem.current_status}</div>
            <div><b>Year:</b> {viewItem.year_of_manufacture || '-'}</div>
            <div><b>Make:</b> {viewItem.make_model || '-'}</div>
          </div>

          {/* Photos */}
          <div className="border-t pt-3">
            <h3 className="font-semibold mb-2">Photos</h3>

            {!viewItem.photos || viewItem.photos.length === 0 ? (
              <p className="text-gray-400 text-sm">No photos uploaded</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {viewItem.photos.map((photo, idx) => (
                  <a
                    href={getFileUrl(photo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                  <img
                    key={idx}
                    src={getFileUrl(photo)}
                    alt="truck"
                    className="rounded border max-h-40 object-cover"
                  />
                  </a>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </FormModal>

      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Truck"
        description={`Are you sure you want to delete truck "${selectedItem?.vehicle_number}"? This action cannot be undone.`}
        loading={saving}
      />
    </PageLayout>
  );
}
