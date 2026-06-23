import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/layout/PageLayout';
import { DataTable } from '../components/shared/DataTable';
import { FormModal } from '../components/shared/FormModal';
import { DeleteDialog } from '../components/shared/DeleteDialog';
import { FileUpload } from '../components/shared/FileUpload';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { liftingsApi, deliveryOrdersApi, productsApi, depotsApi, trucksApi, companiesApi, transportersApi, railwaySidingsApi, exportApi, getFileUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { usePermissions } from '../lib/permissions';
import { validators, formatters } from '../lib/validation';
import { toast } from 'sonner';
import { purchaseOrdersApi } from '../lib/api';
import { Can } from '../components/Can';
import {
  Plus, 
  Package, 
  Truck as TruckIcon, 
  Train, 
  Filter, 
  X, 
  Search, 
  Calendar, 
  Download,
  Eye,
  Edit,
  Trash2} from 'lucide-react';

// Helper to format vehicle number for display
const formatVehicleNumber = (value) => formatters.vehicleNumberDisplay(value);

export default function Liftings() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canViewLiftings = hasPermission('Liftings (View)');

  const canCreatePrimary = hasPermission('Primary Liftings (Create)');
  const canCreateSecondary = hasPermission('Secondary Liftings (Create)');

  const canDeleteLifting = hasPermission('Liftings (Delete)');

  const canViewDeliveryOrders = hasPermission('Delivery Orders (View)');
  const canViewCompanies = hasPermission('Companies (View)');

  const [searchParams] = useSearchParams();
  const urlLiftingNo = searchParams.get('lifting_no') || '';
  const urlDO = searchParams.get('do') || '';
  const [liftings, setLiftings] = useState([]);
  const [filteredLiftings, setFilteredLiftings] = useState([]);
  const [deliveryOrders, setDeliveryOrders] = useState([]);
  const [allDeliveryOrders, setAllDeliveryOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [depots, setDepots] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [sidings, setSidings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const isFileOnlyMode = selectedItem?.unloading_status === 'Verified';
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransportMode, setSelectedTransportMode] = useState('Road');  
  const navigate = useNavigate();
  
    const columns = [
      { key: 'lifting_no', label: 'Lifting No', render: (v) => <span className="mono font-medium">{v}</span> },
      {
        key: 'delivery_order_no',
        label: 'DO No',
        render: (v, row) => {
          const doOrder = allDeliveryOrders.find(o => o.id === row.delivery_order_id);
          const displayNo = doOrder?.client_do_number || doOrder?.do_order_no || v;
          return row.lifting_type === 'Primary' && row.delivery_order_id ? (
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/delivery-orders?do=${encodeURIComponent(
                    displayNo
                  )}`
                )
              }
              className="font-medium text-blue-700 hover:text-blue-900 hover:underline"
            >
              {displayNo || '-'}
            </button>
          ) : (
            <span className="text-gray-400">-</span>
          );
        }
      },
      {
        key: 'do_date',
        label: 'DO Date',
        render: (v, row) => {
          const doOrder = allDeliveryOrders.find(o => o.id === row.delivery_order_id);
          const dateStr = doOrder?.client_do_date || doOrder?.do_date;
          return dateStr ? new Date(dateStr).toLocaleDateString('en-GB') : '-';
        }
      },
      { key: 'date_of_loading', label: 'Date', render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '-' },
      { key: 'lifting_type', label: 'Type', render: (v) => (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          v === 'Primary' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
        }`}>{v}</span>
      )},
      { key: 'unloading_status', label: 'Status', render: (v) => (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          v === 'Verified' ? 'bg-green-100 text-green-800' : v === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
        }`}>{v}</span>
      )},
      { key: 'transport_mode', label: 'Mode', render: (v) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          v === 'Railway' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {v === 'Railway' ? '🚂' : '🚛'}
          {v || 'Road'}
        </span>
      )},
      { key: 'product_name', label: 'Product' },
      { key: 'quantity_mt', label: 'Quantity', render: (v) => <span className="font-medium">{v} MT</span> },
      { key: 'vehicle_number', label: 'Vehicle/Siding', render: (v, row) => (
        row.transport_mode === 'Railway' 
          ? <span className="text-purple-600">{row.loading_siding_name || '-'}</span>
          : <span className="mono tracking-wider">{v ? formatVehicleNumber(v) : '-'}</span>
      )},
      { key: 'loading_point_name', label: 'From' },
      { key: 'unloading_point_name', label: 'To' },
      { key: 'loaded_by_name', label: 'Added By', render: (v, row) => (
        <div className="text-sm">
          <p className="text-gray-700">{v || '-'}</p>
          {row.created_at && (
            <p className="text-gray-400 text-[10px]">
              {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date(row.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          )}
        </div>
      )},
      { key: 'verified_by_name', label: 'Verified By', render: (v, row) => (
        row.unloading_status === 'Verified' ? (
          <div className="text-sm">
            <p className="text-green-700 font-medium">{v || '-'}</p>
            {row.verified_at && (
              <p className="text-gray-400 text-[10px]">
                {new Date(row.verified_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date(row.verified_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </p>
            )}
          </div>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      )},
    ];
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  
  // Vehicle search state
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleDropdownOpen, setVehicleDropdownOpen] = useState(false);
  const [creatingVehicle, setCreatingVehicle] = useState(false);
  
  // Get URL params for pre-filtering
  const urlUnloadingPointType = searchParams.get('unloading_point_type');
  const urlCompanyId = searchParams.get('company_id');
  
  // Filter states - initialize with URL params if present
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    productId: '',
    deliveryOrderId: '',
    deliveryOrderNo: '',
    vehicleId: '',
    transporterName: '',
    loadingPointId: '',
    unloadingPointId: '',
    status: '',
    liftingType: '',
    unloadingPointType: urlUnloadingPointType || '',
companyId: urlCompanyId || '',
      liftingNo: ''
  });
  
  // Auto-expand filters if URL param is present
  useEffect(() => {
    if (urlUnloadingPointType || urlCompanyId || urlLiftingNo || urlDO) {
      setShowFilters(false);
      setFilters(prev => ({ 
        ...prev, 
        unloadingPointType: urlUnloadingPointType || prev.unloadingPointType,
        companyId: urlCompanyId || prev.companyId,
        liftingNo: urlLiftingNo || prev.liftingNo,
        deliveryOrderNo: urlDO || prev.deliveryOrderNo
      }));
    }
  }, [urlUnloadingPointType, urlCompanyId, urlLiftingNo, urlDO]);
  
  const [liftingType, setLiftingType] = useState('Primary');
  const [formData, setFormData] = useState({
    lifting_type: 'Primary',
    transport_mode: 'Road',
    delivery_order_id: '',
    delivery_order_no: '',
    product_id: '',
    product_name: '',
    product_code: '',
    quantity_mt: '',
    loading_point_type: 'Company',
    loading_point_id: '',
    loading_point_name: '',
    date_of_loading: new Date().toISOString().split('T')[0],
    time_of_loading: new Date().toTimeString().slice(0, 5),
    vehicle_id: '',
    vehicle_number: '',
    transporter_name: '',
    driver_name: '',
    driver_mobile: '',
    helper_name: '',
    helper_mobile: '',
    // Railway siding fields
    loading_siding_id: '',
    loading_siding_name: '',
    loading_siding_code: '',
    destination_siding_id: '',
    destination_siding_name: '',
    destination_siding_code: '',
    tare_weight_mt: '',
    gross_weight_mt: '',
    net_weight_mt: '',
    weight_slip: '',
    unloading_point_type: 'Depot',
    unloading_point_id: '',
    unloading_point_name: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Apply filters whenever filters or liftings change
  useEffect(() => {
    applyFilters();
  }, [filters, liftings]);

  const fetchData = async () => {
    try {
        const canViewDeliveryOrders = hasPermission('Delivery Orders (View)');
        const canViewCompanies = hasPermission('Companies (View)');

        const apiCalls = [
          purchaseOrdersApi.getAll(),
          liftingsApi.getAll(),
          productsApi.getAll(),
          depotsApi.getAll(),
          trucksApi.getAll(),
          transportersApi.getAll(),
          railwaySidingsApi.getAll()
        ];

        if (canViewDeliveryOrders) {
          apiCalls.push(deliveryOrdersApi.getAll());
        }
        if (canViewCompanies) {
          apiCalls.push(companiesApi.getAll());
        }

        const results = await Promise.all(apiCalls);

        let idx = 0;

        const poRes = results[idx++];
        setPurchaseOrders(poRes.data.filter(p => p.status !== 'Completed'));

        setLiftings(results[idx].data);
        setFilteredLiftings(results[idx].data);
        idx++;

        setProducts(results[idx++].data);
        setDepots(results[idx++].data);
        setTrucks(results[idx++].data);
        setTransporters(results[idx++].data);
        setSidings(results[idx++].data);

        if (canViewDeliveryOrders) {
          setAllDeliveryOrders(results[idx].data);
          setDeliveryOrders(results[idx].data.filter(o => o.status !== 'Completed'));
          idx++;
        }

        if (canViewCompanies) {
          setCompanies(results[idx].data);
        }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load some data');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePurchaseOrderChange = (poId) => {
    const po = purchaseOrders.find(p => p.id === poId);

    if (po) {
      const transportMode = po.transport_mode || 'Road';
      setSelectedTransportMode(transportMode);

      // Determine loading point type based on PO source type
      const loadingPointType = po.source_type === 'Company' ? 'Company' : 'Depot';
      const loadingPointId = po.source_type === 'Company' ? po.source_company_id : po.depot_id;
      const loadingPointName = po.source_type === 'Company' ? po.source_company_name : po.depot_name;

      setFormData({
        ...formData,
        purchase_order_id: po.id,
        purchase_order_no: po.po_number,

        product_id: po.product_id,
        product_name: po.product_name,
        product_code: po.product_code,

        loading_point_type: loadingPointType,
        loading_point_id: loadingPointId,
        loading_point_name: loadingPointName,

        unloading_point_type: 'Company',
        unloading_point_id: po.to_company_id,
        unloading_point_name: po.to_company_name,

        transport_mode: transportMode
      });
    }
  };
    

  const applyFilters = () => {
    let filtered = [...liftings];
    
    if (filters.dateFrom) {
      filtered = filtered.filter(l => l.date_of_loading >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(l => l.date_of_loading <= filters.dateTo);
    }
    if (filters.productId) {
      filtered = filtered.filter(l => l.product_id === filters.productId);
    }
    if (filters.deliveryOrderId) {
      filtered = filtered.filter(l => l.delivery_order_id === filters.deliveryOrderId);
    }
    if (filters.vehicleId) {
      filtered = filtered.filter(l => l.vehicle_id === filters.vehicleId);
    }
    if (filters.transporterName) {
      filtered = filtered.filter(l => 
        l.transporter_name?.toLowerCase().includes(filters.transporterName.toLowerCase())
      );
    }
    if (filters.loadingPointId) {
      filtered = filtered.filter(l => l.loading_point_id === filters.loadingPointId);
    }
    if (filters.unloadingPointId) {
      filtered = filtered.filter(l => l.unloading_point_id === filters.unloadingPointId);
    }
    if (filters.status) {
      filtered = filtered.filter(l => l.unloading_status === filters.status);
    }
    if (filters.liftingType) {
      filtered = filtered.filter(l => l.lifting_type === filters.liftingType);
    }
    if (filters.liftingNo) {
      filtered = filtered.filter(l => l.lifting_no?.toLowerCase() === filters.liftingNo.toLowerCase());
    }
    if (filters.deliveryOrderNo) {
      filtered = filtered.filter(l => l.delivery_order_no?.toLowerCase() === filters.deliveryOrderNo.toLowerCase());
    }
    // NEW: Filter by unloading point type (Company, Depot, etc.)
    if (filters.unloadingPointType) {
      filtered = filtered.filter(l => l.unloading_point_type === filters.unloadingPointType);
    }
    // NEW: Filter by company (unloading point)
    if (filters.companyId) {
      filtered = filtered.filter(l => l.unloading_point_id === filters.companyId);
    }
    
    setFilteredLiftings(filtered);
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      productId: '',
      deliveryOrderId: '',
      vehicleId: '',
      transporterName: '',
      loadingPointId: '',
      unloadingPointId: '',
      status: '',
      liftingType: '',
      unloadingPointType: '',
      companyId: '',
      liftingNo: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  // Check if there are open delivery orders available
  const hasOpenDeliveryOrders = deliveryOrders.length > 0;

  const handleAdd = (type) => {
      setSelectedItem(null);
    // For Primary liftings, check if there are open Delivery Orders
    if (liftingType === 'Primary' && !hasOpenDeliveryOrders) {
      toast.error('No open Delivery Orders available. Please create a Delivery Order first before creating a Primary Lifting.', {
        duration: 5000,
        icon: '⚠️'
      });
      return;
    }
    
    setLiftingType(type);
    
    setFormData({
      lifting_type: type,
      transport_mode: 'Road',
      delivery_order_id: '',
      delivery_order_no: '',
      product_id: '',
      product_name: '',
      product_code: '',
      quantity_mt: '',
      loading_point_type: type === 'Primary' ? 'Company' : 'Depot',
      loading_point_id: '',
      loading_point_name: '',
      date_of_loading: new Date().toISOString().split('T')[0],
      time_of_loading: new Date().toTimeString().slice(0, 5),
      vehicle_id: '',
      vehicle_number: '',
      transporter_name: '',
      driver_name: '',
      driver_mobile: '',
      helper_name: '',
      helper_mobile: '',
      loading_siding_id: '',
      loading_siding_name: '',
      loading_siding_code: '',
      destination_siding_id: '',
      destination_siding_name: '',
      destination_siding_code: '',
      tare_weight_mt: '',
      gross_weight_mt: '',
      net_weight_mt: '',
      weight_slip: '',
      unloading_point_type: 'Depot',
      unloading_point_id: '',
      unloading_point_name: '',
    });
    setSelectedTransportMode('Road');
    setVehicleSearch('');
    setVehicleDropdownOpen(false);
    setSelectedTruckDrivers([]);
    setModalOpen(true);
  };

  const handleDeliveryOrderChange = (orderId) => {
    const order = deliveryOrders.find(o => o.id === orderId);
    if (order) {
      const transportMode = order.transport_mode || 'Road';
      const destinationType = order.destination_type || 'Depot';
      setSelectedTransportMode(transportMode);
      
      setFormData({
        ...formData,
        delivery_order_id: orderId,
        delivery_order_no: order.do_order_no,
        transport_mode: transportMode,
        product_id: order.product_id,
        product_name: order.product_name,
        product_code: order.product_code || '',
        loading_point_id: order.from_company_id || '',
        loading_point_name: order.from_company_name || '',
        unloading_point_type: destinationType === 'Company' ? 'Company' : 'Depot',
        unloading_point_id: destinationType === 'Company' ? order.to_company_id : order.to_depot_id,
        unloading_point_name: destinationType === 'Company' ? order.to_company_name : order.to_depot_name,
        // Railway siding info from DO
        loading_siding_id: order.loading_siding_id || '',
        loading_siding_name: order.loading_siding_name || '',
        loading_siding_code: order.loading_siding_code || '',
        destination_siding_id: order.destination_siding_id || '',
        destination_siding_name: order.destination_siding_name || '',
        destination_siding_code: order.destination_siding_code || '',
      });
    }
  };

  const [selectedTruckDrivers, setSelectedTruckDrivers] = useState([]);
  const [isNewDriver, setIsNewDriver] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  
  const handleView = (row) => {
    setViewItem(row);
    setViewModalOpen(true);
  };

  const handleTruckChange = (truckId) => {
    const truck = trucks.find(t => t.id === truckId);
    if (truck) {
      const drivers = truck.drivers || [];
      setSelectedTruckDrivers(drivers);
      
      // Pre-select primary driver if available
      const primaryDriver = drivers.find(d => d.is_primary) || drivers[0];
      
      setFormData({
        ...formData,
        vehicle_id: truckId,
        vehicle_number: truck.vehicle_number,
        transporter_name: truck.transporter_name || '',
        driver_name: primaryDriver?.name || truck.driver_name || '',
        driver_mobile: primaryDriver?.mobile || truck.driver_mobile || '',
        helper_name: truck.helper_name || '',
        helper_mobile: truck.helper_mobile || '',
        tare_weight_mt: truck.tare_weight_mt || '',
      });
      setIsNewDriver(false);
    }
  };

  const handleDriverSelect = (driverValue) => {
    if (driverValue === 'new') {
      setIsNewDriver(true);
      setFormData({ ...formData, driver_name: '', driver_mobile: '' });
    } else {
      setIsNewDriver(false);
      const driver = selectedTruckDrivers.find(d => d.mobile === driverValue || d.name === driverValue);
      if (driver) {
        setFormData({
          ...formData,
          driver_name: driver.name,
          driver_mobile: driver.mobile || ''
        });
      }
    }
  };

  // Filter trucks based on search query
  const filteredTrucks = trucks.filter(t => 
    t.vehicle_number?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    t.driver_name?.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    t.transporter_name?.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  // Check if exact match exists
  const exactMatchExists = trucks.some(t => 
    t.vehicle_number?.toLowerCase() === vehicleSearch.toLowerCase()
  );

  // Handle selecting an existing vehicle
  const handleVehicleSelect = (truck) => {
    handleTruckChange(truck.id);
    setVehicleSearch(truck.vehicle_number);
    setVehicleDropdownOpen(false);
  };

  // Handle creating a new vehicle
  const handleCreateNewVehicle = async () => {
      
    const vehicleNumber = vehicleSearch.trim().toUpperCase();

    setFormData({
      ...formData,
      vehicle_id: '', 
      vehicle_number: vehicleNumber
    });

    setVehicleDropdownOpen(false);

    toast.success(`Using temporary vehicle: ${vehicleNumber}`);
//    if (!vehicleSearch.trim()) {
//      toast.error('Please enter a vehicle number');
//      return;
//    }
//    navigate(`/trucks?vehicle=${encodeURIComponent(vehicleSearch)}`);
//    // Validate vehicle number format (basic validation)
//    const vehicleNumber = vehicleSearch.trim().toUpperCase();
//    
//    setCreatingVehicle(true);
//    try {
//      const response = await trucksApi.create({
//        vehicle_number: vehicleNumber,
//        vehicle_type: 'Truck',
//        capacity_mt: 0,
//        status: 'Active'
//      });
//      
//      // Add the new truck to the list
//      const newTruck = response.data;
//      setTrucks(prev => [...prev, newTruck]);
//      
//      // Select the newly created truck
//      setFormData({
//        ...formData,
//        vehicle_id: newTruck.id,
//        vehicle_number: newTruck.vehicle_number,
//        transporter_name: '',
//        driver_name: '',
//        driver_mobile: '',
//        helper_name: '',
//        helper_mobile: '',
//        tare_weight_mt: '',
//      });
//      setSelectedTruckDrivers([]);
//      setVehicleSearch(newTruck.vehicle_number);
//      setVehicleDropdownOpen(false);
//      
//      toast.success(`Vehicle ${vehicleNumber} created and selected!`, {
//        icon: '🚛'
//      });
//    } catch (error) {
//      console.error('Failed to create vehicle:', error);
//      toast.error('Failed to create vehicle. Please try again.');
//    } finally {
//      setCreatingVehicle(false);
//    }
  };

  // Clear vehicle selection
  const clearVehicleSelection = () => {
    setVehicleSearch('');
    setFormData({
      ...formData,
      vehicle_id: '',
      vehicle_number: '',
      transporter_name: '',
      driver_name: '',
      driver_mobile: '',
      helper_name: '',
      helper_mobile: '',
      tare_weight_mt: '',
    });
    setSelectedTruckDrivers([]);
  };

  const handleLoadingPointChange = (pointId) => {
    if (formData.loading_point_type === 'Depot') {
      const depot = depots.find(d => d.id === pointId);
      setFormData({ ...formData, loading_point_id: pointId, loading_point_name: depot?.name || '' });
    } else {
      const company = companies.find(c => c.id === pointId);
      setFormData({ ...formData, loading_point_id: pointId, loading_point_name: company?.name || '' });
    }
  };

  const handleUnloadingPointChange = (pointId) => {
    if (formData.unloading_point_type === 'Depot') {
      const depot = depots.find(d => d.id === pointId);
      setFormData({ ...formData, unloading_point_id: pointId, unloading_point_name: depot?.name || '' });
    } else {
      const company = companies.find(c => c.id === pointId);
      setFormData({ ...formData, unloading_point_id: pointId, unloading_point_name: company?.name || '' });
    }
  };

  const handleWeightChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    if (newData.gross_weight_mt && newData.tare_weight_mt) {
      const gross = parseFloat(newData.gross_weight_mt) || 0;
      const tare = parseFloat(newData.tare_weight_mt) || 0;
      if (gross > 0 && tare > 0) {
        newData.net_weight_mt = (gross - tare).toFixed(3);
      }
    }
    setFormData(newData);
  };
  
  const handleEdit = (row) => {
        setSelectedItem(row);

        setLiftingType(row.lifting_type);

        setFormData({
          lifting_type: row.lifting_type || 'Primary',
          transport_mode: row.transport_mode || 'Road',

          delivery_order_id: row.delivery_order_id || '',
          delivery_order_no: row.delivery_order_no || '',

          purchase_order_id: row.purchase_order_id || '',
          purchase_order_no: row.purchase_order_no || '',

          product_id: row.product_id || '',
          product_name: row.product_name || '',
          product_code: row.product_code || '',

          quantity_mt: row.quantity_mt || '',

          loading_point_type: row.loading_point_type || 'Company',
          loading_point_id: row.loading_point_id || '',
          loading_point_name: row.loading_point_name || '',

          unloading_point_type: row.unloading_point_type || 'Depot',
          unloading_point_id: row.unloading_point_id || '',
          unloading_point_name: row.unloading_point_name || '',

          date_of_loading: row.date_of_loading || '',
          time_of_loading: row.time_of_loading || '',

          vehicle_id: row.vehicle_id || '',
          vehicle_number: row.vehicle_number || '',

          transporter_name: row.transporter_name || '',

          driver_name: row.driver_name || '',
          driver_mobile: row.driver_mobile || '',

          helper_name: row.helper_name || '',
          helper_mobile: row.helper_mobile || '',

          loading_siding_id: row.loading_siding_id || '',
          loading_siding_name: row.loading_siding_name || '',
          loading_siding_code: row.loading_siding_code || '',

          destination_siding_id: row.destination_siding_id || '',
          destination_siding_name: row.destination_siding_name || '',
          destination_siding_code: row.destination_siding_code || '',

          tare_weight_mt: row.tare_weight_mt || '',
          gross_weight_mt: row.gross_weight_mt || '',
          net_weight_mt: row.net_weight_mt || '',

          weight_slip: row.weight_slip || ''
        });

        setSelectedTransportMode(
          row.transport_mode || 'Road'
        );

        setVehicleSearch(row.vehicle_number || '');

        setModalOpen(true);
      };

  const handleSubmit = async () => {
      if (isFileOnlyMode) {
        try {
          await liftingsApi.update(selectedItem.id, {
            ...selectedItem,
            weight_slip: formData.weight_slip
          });

          toast.success('Files updated successfully');

          setModalOpen(false);
          fetchData();

          return;
        } catch (err) {
          toast.error('Failed to update files');
          return;
        }
      }
    // Validation
    const errors = [];
	if (
	  (liftingType === 'Primary' && !canCreatePrimary) ||
	  (liftingType === 'Secondary' && !canCreateSecondary)
	) {
	  toast.error('You do not have permission to create this lifting');
	  return;
	}
    if (liftingType === 'Secondary' && !formData.purchase_order_id) {
        errors.push('Purchase Order is required for Secondary Lifting');
    }
    
    if (!formData.quantity_mt) {
      errors.push('Quantity is required');
    } else {
      const qtyError = validators.quantity(formData.quantity_mt, 'Quantity');
      if (qtyError) errors.push(qtyError);
    }
    
    // Validate based on transport mode
    if (selectedTransportMode === 'Road') {
      if (!formData.vehicle_number) {
        errors.push('Please enter a vehicle number');
      }
//      if (formData.driver_mobile) {
//        const mobileError = validators.mobile(formData.driver_mobile, 'Driver mobile');
//        if (mobileError) errors.push(mobileError);
//      }
      if (formData.helper_mobile) {
        const helperError = validators.mobile(formData.helper_mobile, 'Helper mobile');
        if (helperError) errors.push(helperError);
      }
    } else if (selectedTransportMode === 'Railway') {
      if (!formData.loading_siding_id || !formData.destination_siding_id) {
        errors.push('Please select Loading and Destination Sidings');
      }
    }
    
    if (formData.tare_weight_mt) {
      const tareError = validators.positiveNumber(formData.tare_weight_mt, 'Tare weight');
      if (tareError) errors.push(tareError);
    }
    
    if (formData.gross_weight_mt) {
      const grossError = validators.positiveNumber(formData.gross_weight_mt, 'Gross weight');
      if (grossError) errors.push(grossError);
    }
    
    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...formData,
        quantity_mt: parseFloat(formData.quantity_mt),
        tare_weight_mt: formData.tare_weight_mt ? parseFloat(formData.tare_weight_mt) : null,
        gross_weight_mt: formData.gross_weight_mt ? parseFloat(formData.gross_weight_mt) : null,
        net_weight_mt: formData.net_weight_mt ? parseFloat(formData.net_weight_mt) : null,
      };
      if (selectedItem) {
        await liftingsApi.update(selectedItem.id, payload);
        toast.success('Lifting updated successfully');
      } else {
        await liftingsApi.create(payload);
        toast.success('Lifting created successfully');
      }
      setModalOpen(false);
        setSelectedItem(null);
        fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create lifting');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    const params = {};
    if (filters.dateFrom) params.date_from = filters.dateFrom;
    if (filters.dateTo) params.date_to = filters.dateTo;
    if (filters.productId) params.product_id = filters.productId;
    if (filters.deliveryOrderId) params.delivery_order_id = filters.deliveryOrderId;
    if (filters.vehicleId) params.vehicle_id = filters.vehicleId;
    if (filters.transporterName) params.transporter_name = filters.transporterName;
    if (filters.loadingPointId) params.loading_point_id = filters.loadingPointId;
    if (filters.unloadingPointId) params.unloading_point_id = filters.unloadingPointId;
    if (filters.status) params.unloading_status = filters.status;
    if (filters.liftingType) params.lifting_type = filters.liftingType;
    
    const url = exportApi.liftings(params);
    window.open(url, '_blank');
    toast.success('Export started');
  };

  // Check if current user is Master Admin
  const isMasterAdmin = user?.role === 'Admin' && user?.name === 'Master Admin';

  // Handle delete - Master Admin can delete verified entries
  const handleDelete = (item) => {
	if (!canDeleteLifting) {
	  toast.error('You do not have permission to delete liftings');
	  return;
	}

    // Only Master Admin can delete verified entries
    if (item.unloading_status === 'Verified' && !isMasterAdmin) {
      toast.error('Only Master Admin can delete verified liftings');
      return;
    }
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await liftingsApi.delete(selectedItem.id);
      toast.success('Lifting deleted successfully');
      setDeleteOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete lifting');
    } finally {
      setSaving(false);
    }
  };


  // Get unique transporters from liftings for filter
  const uniqueTransporters = [...new Set(liftings.map(l => l.transporter_name).filter(Boolean))];
  const canUpdateLiftings = hasPermission('Liftings (Update)');

  // Combine companies and depots for loading point filter
  const allLoadingPoints = [
    ...companies.map(c => ({ id: c.id, name: c.name, type: 'Company' })),
    ...depots.map(d => ({ id: d.id, name: d.name, type: 'Depot' }))
  ];

  // Calculate stats for filtered data
  const stats = {
    total: filteredLiftings.length,
    primary: filteredLiftings.filter(l => l.lifting_type === 'Primary').length,
    secondary: filteredLiftings.filter(l => l.lifting_type === 'Secondary').length,
    pending: filteredLiftings.filter(l => l.unloading_status === 'Pending').length,
    verified: filteredLiftings.filter(l => l.unloading_status === 'Verified').length,
    // Primary bifurcation: Company to Depot & Company to Client
    primaryToDepot: filteredLiftings.filter(l => l.lifting_type === 'Primary' && l.unloading_point_type === 'Depot').length,
    primaryToDepotQty: filteredLiftings.filter(l => l.lifting_type === 'Primary' && l.unloading_point_type === 'Depot').reduce((sum, l) => sum + (l.quantity_mt || 0), 0).toFixed(2),
    primaryToClient: filteredLiftings.filter(l => l.lifting_type === 'Primary' && l.unloading_point_type === 'Company').length,
    primaryToClientQty: filteredLiftings.filter(l => l.lifting_type === 'Primary' && l.unloading_point_type === 'Company').reduce((sum, l) => sum + (l.quantity_mt || 0), 0).toFixed(2),
    // Secondary bifurcation: Depot to Client & Depot to Depot
    secondaryToClient: filteredLiftings.filter(l => l.lifting_type === 'Secondary' && l.unloading_point_type === 'Company').length,
    secondaryToClientQty: filteredLiftings.filter(l => l.lifting_type === 'Secondary' && l.unloading_point_type === 'Company').reduce((sum, l) => sum + (l.quantity_mt || 0), 0).toFixed(2),
    secondaryToDepot: filteredLiftings.filter(l => l.lifting_type === 'Secondary' && l.unloading_point_type === 'Depot').length,
    secondaryToDepotQty: filteredLiftings.filter(l => l.lifting_type === 'Secondary' && l.unloading_point_type === 'Depot').reduce((sum, l) => sum + (l.quantity_mt || 0), 0).toFixed(2)
  };
  
  const handleAddFiles = (row) => {
    setSelectedItem(row);

    setFormData(prev => ({
      ...prev,
      weight_slip: row.weight_slip || ''
    }));

    setViewItem(row);

    setModalOpen(true);
  };
  
    const customActions = (row) => {

        // 🔒 REJECTED
        if (row.unloading_status === 'Rejected') {

          if (user?.role === 'Management') {
            return (
              <Can action="delete_lifting">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(row)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Can>
            );
          }

          return null;
        }

        // ✅ VERIFIED
        if (row.unloading_status === 'Verified') {
            return (
              <>
                {/* 👁 VIEW ALWAYS VISIBLE */}
                {canViewLiftings && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleView(row)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}

                {/* 📎 ADD FILES */}
                {canUpdateLiftings && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAddFiles(row)}
                  >
                    📎 Add Files
                  </Button>
                )}
              </>
            );
          }

        // 🟡 NORMAL
        return (
          <>
            {canViewLiftings && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleView(row)}
              >
                <Eye className="w-4 h-4" />
              </Button>
            )}

            <Can action="update_lifting">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(row)}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </Can>
          </>
        );
      };

  
  if (!canViewLiftings) {
	return (
		<PageLayout title="Liftings">
		  <div className="p-8 text-center text-gray-500">
			You do not have permission to view liftings.
		  </div>
		</PageLayout>
	);
  }
  
  


  return (
    <PageLayout
      title="Liftings"
      subtitle="Truck-wise loading records"
      actions={
        <div className="flex gap-2">
            {canViewLiftings && (
			  <Button 
				variant="outline"
				onClick={handleExport}
				disabled={filteredLiftings.length === 0}
			  >
				<Download className="w-4 h-4 mr-2" />
				Export Excel
			  </Button>
			)}

          <Button 
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? "border-orange-500 text-orange-600" : ""}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters {hasActiveFilters && `(${Object.values(filters).filter(v => v).length})`}
          </Button>
          <Can action="create_primary_lifting">
            <Button 
              onClick={() => { setLiftingType('Primary'); handleAdd('Primary'); }} 
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="add-primary-lifting-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
               ↓ STOCK IN
            </Button>
          </Can>
        </div>
      }
    >
      {/* Filter Panel */}
      {showFilters && (
        <Card className="mb-6 border-orange-200 bg-orange-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Search className="w-4 h-4" />
                Filter Liftings
              </h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-orange-600">
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {/* Date Range */}
              <div>
                <Label className="text-xs text-gray-600">From Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="pl-8 h-9"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">To Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="pl-8 h-9"
                  />
                </div>
              </div>

              {/* Product */}
              <div>
                <Label className="text-xs text-gray-600">Product</Label>
                <Select value={filters.productId} onValueChange={(v) => setFilters({ ...filters, productId: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery Order */}
              <div>
                <Label className="text-xs text-gray-600">Delivery Order</Label>
                <Select value={filters.deliveryOrderId} onValueChange={(v) => setFilters({ ...filters, deliveryOrderId: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All DOs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All DOs</SelectItem>
                    {allDeliveryOrders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{o.client_do_number || o.do_order_no}</span>
                          <span className="text-xs text-gray-500">{o.product_name} • {o.total_quantity_mt} MT</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle */}
              <div>
                <Label className="text-xs text-gray-600">Vehicle</Label>
                <Select value={filters.vehicleId} onValueChange={(v) => setFilters({ ...filters, vehicleId: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Vehicles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vehicles</SelectItem>
                    {trucks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.vehicle_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transporter */}
              <div>
                <Label className="text-xs text-gray-600">Transporter</Label>
                <Select value={filters.transporterName} onValueChange={(v) => setFilters({ ...filters, transporterName: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Transporters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Transporters</SelectItem>
                    {uniqueTransporters.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Loading Point */}
              <div>
                <Label className="text-xs text-gray-600">Loading Point (From)</Label>
                <Select value={filters.loadingPointId} onValueChange={(v) => setFilters({ ...filters, loadingPointId: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {allLoadingPoints.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unloading Point */}
              <div>
                <Label className="text-xs text-gray-600">Unloading Point (To)</Label>
                <Select value={filters.unloadingPointId} onValueChange={(v) => setFilters({ ...filters, unloadingPointId: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Destinations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Destinations</SelectItem>
                    {depots.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div>
                <Label className="text-xs text-gray-600">Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Lifting Type */}
              <div>
                <Label className="text-xs text-gray-600">Lifting Type</Label>
                <Select value={filters.liftingType} onValueChange={(v) => setFilters({ ...filters, liftingType: v === 'all' ? '' : v })}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Primary">Primary</SelectItem>
                    <SelectItem value="Secondary">Secondary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Unloading Point Type */}
              <div>
                <Label className="text-xs text-gray-600">Unloading Type</Label>
                <Select value={filters.unloadingPointType} onValueChange={(v) => setFilters({ ...filters, unloadingPointType: v === 'all' ? '' : v })}>
                  <SelectTrigger className={`h-9 ${filters.unloadingPointType ? 'border-emerald-500 bg-emerald-50' : ''}`}>
                    <SelectValue placeholder="All Destinations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Destinations</SelectItem>
                    <SelectItem value="Company">To Company</SelectItem>
                    <SelectItem value="Depot">To Depot</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Company Filter */}
              <div>
                <Label className="text-xs text-gray-600">Company (Destination)</Label>
                <Select value={filters.companyId} onValueChange={(v) => setFilters({ ...filters, companyId: v === 'all' ? '' : v })}>
                  <SelectTrigger className={`h-9 ${filters.companyId ? 'border-emerald-500 bg-emerald-50' : ''}`}>
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards - Consolidated Bifurcation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Liftings with Bifurcation - Single Card */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Total Liftings</p>
                <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  {stats.total}
                </p>
                {hasActiveFilters && <p className="text-[10px] text-gray-400">of {liftings.length} total</p>}
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <TruckIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            
            {/* Primary & Secondary Breakup */}
            <div className="border-t pt-3 mt-2 space-y-2">
              {/* Primary: Company → */}
              <div>
                <p className="text-[10px] font-semibold text-blue-600 mb-1">Primary ({stats.primary})</p>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="bg-blue-50 rounded px-2 py-1">
                    <span className="text-gray-500">Co.→Depot: </span>
                    <span className="font-semibold text-blue-700">{stats.primaryToDepotQty} MT</span>
                  </div>
                  <div className="bg-green-50 rounded px-2 py-1">
                    <span className="text-gray-500">Co.→Client: </span>
                    <span className="font-semibold text-green-700">{stats.primaryToClientQty} MT</span>
                  </div>
                </div>
              </div>
              
              {/* Secondary: Depot → */}
              <div>
                <p className="text-[10px] font-semibold text-purple-600 mb-1">Secondary ({stats.secondary})</p>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div className="bg-purple-50 rounded px-2 py-1">
                    <span className="text-gray-500">Depot→Client: </span>
                    <span className="font-semibold text-purple-700">{stats.secondaryToClientQty} MT</span>
                  </div>
                  <div className="bg-indigo-50 rounded px-2 py-1">
                    <span className="text-gray-500">Depot→Depot: </span>
                    <span className="font-semibold text-indigo-700">{stats.secondaryToDepotQty} MT</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Verification */}
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Pending Verification</p>
                <p className="text-3xl font-bold text-amber-600" style={{ fontFamily: 'Manrope' }}>
                  {stats.pending}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Awaiting unload verification</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verified */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Verified</p>
                <p className="text-3xl font-bold text-green-600" style={{ fontFamily: 'Manrope' }}>
                  {stats.verified}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Unloading confirmed</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

        <DataTable
		  columns={columns}
		  data={filteredLiftings}
		  loading={loading}
		  customActions={customActions}
		  emptyMessage={
			hasActiveFilters
			  ? "No liftings match your filters."
			  : canCreatePrimary || canCreateSecondary
				? "No liftings found. Create your first lifting!"
				: "No liftings found."
		  }
		/>

    <FormModal
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title={`Lifting Details - ${viewItem?.lifting_no}`}
        hideSubmit
      >
        {viewItem && (
          <div className="space-y-4">

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><b>Type:</b> {viewItem.lifting_type}</div>
              <div><b>Quantity:</b> {viewItem.quantity_mt} MT</div>
              <div><b>Vehicle:</b> {viewItem.vehicle_number}</div>
              <div><b>Status:</b> {viewItem.unloading_status}</div>
            </div>

            {/* Uploads Section */}
            <div className="border-t pt-3">
              <h3 className="font-semibold mb-2">Uploads</h3>

              {!viewItem.weight_slip ? (
                <p className="text-gray-400 text-sm">No uploads available</p>
              ) : (
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                  <div className="text-sm">
                    📄 Weight Slip
                  </div>
            {viewItem.weight_slip?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
              <img
                src={getFileUrl(viewItem.weight_slip)}
                className="max-h-48 rounded border"
              />
            ) : (
                  <a
                    href={getFileUrl(viewItem.weight_slip)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View / Download
                  </a>
                )}
                </div>
              )}
            </div>

          </div>
        )}
      </FormModal>


      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
            selectedItem
              ? selectedItem.unloading_status === 'Verified'
                ? 'Add Files'
                : 'Edit Stock IN'
              : 'Create Stock IN'
          }
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel="Create Stock IN"
        disabled={
            selectedItem?.unloading_status === 'Verified'
        }
      >
      {!isFileOnlyMode && (
        <div className="grid grid-cols-2 gap-4">
          {/* Primary: Select Delivery Order */}
          {liftingType === 'Primary' && (
            <div className="col-span-2">
              <Label>Delivery Order *</Label>
              <Select value={formData.delivery_order_id} onValueChange={handleDeliveryOrderChange}>
                <SelectTrigger data-testid="lifting-do-select">
                  <SelectValue placeholder="Select delivery order" />
                </SelectTrigger>
                <SelectContent>
                  {deliveryOrders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.client_do_number || o.do_order_no} - {o.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Secondary: Select Product and Source Depot */}
            {liftingType === 'Secondary' && (
                <div className="col-span-2">
                  <Label>Purchase Order *</Label>
                  <Select
                    value={formData.purchase_order_id}
                    onValueChange={handlePurchaseOrderChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Purchase Order" />
                    </SelectTrigger>
                    <SelectContent>
                      {purchaseOrders
                        .filter(po => po.remaining_quantity_mt > 0)
                        .map((po) => (
                          <SelectItem key={po.id} value={po.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{po.po_number}</span>
                              <span className="text-xs text-gray-500">
                                {po.product_name} • {po.source_type === 'Company' ? po.source_company_name : po.depot_name}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

          {/* Show transport mode indicator for Primary liftings */}
          {liftingType === 'Primary' && formData.delivery_order_id && (
            <div className="col-span-2">
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                selectedTransportMode === 'Railway' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {selectedTransportMode === 'Railway' ? <Train className="w-5 h-5" /> : <TruckIcon className="w-5 h-5" />}
                <span className="font-medium">Transport Mode: {selectedTransportMode === 'Railway' ? 'Railway (Rake)' : 'Road (Truck)'}</span>
              </div>
            </div>
          )}

          {/* ROAD MODE: Vehicle Selection - Searchable Combobox */}
          {selectedTransportMode === 'Road' && (
            <div className="relative">
              <Label>Vehicle Number *</Label>
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search or enter vehicle number..."
                    value={vehicleSearch}
                    onChange={(e) => {
                      setVehicleSearch(e.target.value);
                      setVehicleDropdownOpen(true);
                    }}
                    onBlur={() => {
                        if (vehicleSearch && !formData.vehicle_id) {
                          setFormData(prev => ({
                            ...prev,
                            vehicle_number: vehicleSearch.toUpperCase()
                          }));
                        }
                    }}
                    onFocus={() => setVehicleDropdownOpen(true)}
                    className="pl-9 pr-8"
                    data-testid="lifting-vehicle-search"
                  />
                  {vehicleSearch && (
                    <button
                      type="button"
                      onClick={clearVehicleSelection}
                      className="absolute right-2 p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
                
                {/* Dropdown */}
                {vehicleDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {/* Show matching vehicles */}
                    {filteredTrucks.length > 0 ? (
                      <>
                        <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                          {vehicleSearch ? `Matching vehicles (${filteredTrucks.length})` : `All vehicles (${trucks.length})`}
                        </div>
                        {filteredTrucks.slice(0, 50).map((truck) => (
                          <div
                            key={truck.id}
                            onClick={() => handleVehicleSelect(truck)}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                              formData.vehicle_id === truck.id ? 'bg-blue-100' : ''
                            }`}
                          >
                            <div>
                              <p className="font-medium text-sm tracking-wide">{formatters.vehicleNumberDisplay(truck.vehicle_number)}</p>
                              <p className="text-xs text-gray-500">
                                {truck.driver_name || 'No driver'} 
                                {truck.transporter_name && ` • ${truck.transporter_name}`}
                              </p>
                            </div>
                            {formData.vehicle_id === truck.id && (
                              <span className="text-blue-600 text-xs">✓ Selected</span>
                            )}
                          </div>
                        ))}
                        {filteredTrucks.length > 50 && (
                          <div className="px-3 py-2 text-xs text-gray-500 text-center border-t">
                            Showing first 50 results. Type more to narrow down.
                          </div>
                        )}
                      </>
                    ) : vehicleSearch ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No matching vehicles found
                      </div>
                    ) : null}
                    
                    {/* Option to add new vehicle */}
                    {vehicleSearch && !exactMatchExists && (
                      <div
                        onClick={handleCreateNewVehicle}
                        className="px-3 py-2.5 cursor-pointer bg-green-50 hover:bg-green-100 border-t flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-green-700">
                            {creatingVehicle ? 'Creating...' : `Add new vehicle: "${formatters.vehicleNumberDisplay(vehicleSearch)}"`}
                          </p>
                          <p className="text-xs text-green-600">Click to create and select this vehicle</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Close dropdown button */}
                    <div 
                      onClick={() => setVehicleDropdownOpen(false)}
                      className="px-3 py-1.5 text-xs text-center text-gray-500 bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                    >
                      Close
                    </div>
                  </div>
                )}
              </div>
              
              {/* Selected vehicle info */}
              {formData.vehicle_id && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <TruckIcon className="w-3 h-3" />
                  Selected: <span className="font-medium tracking-wide">{formatters.vehicleNumberDisplay(formData.vehicle_number)}</span>
                  {formData.transporter_name && <span className="text-gray-500">• {formData.transporter_name}</span>}
                </p>
              )}
            </div>
          )}

          {/* RAILWAY MODE: Siding Selection */}

          <div>
            <Label htmlFor="date_of_loading">Date of Un - Loading</Label>
            <Input
              id="date_of_loading"
              type="date"
              value={formData.date_of_loading}
              onChange={(e) => setFormData({ ...formData, date_of_loading: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="time_of_loading">Time of Un - Loading</Label>
            <Input
              id="time_of_loading"
              type="time"
              value={formData.time_of_loading}
              onChange={(e) => setFormData({ ...formData, time_of_loading: e.target.value })}
            />
          </div>

          {/* Driver Selection - Only for Road mode */}

          {/* Driver Dropdown - show if truck has drivers */}

          {/* Driver Details - Always editable */}

          {/* Helper Details */}

          {/* Unloading Point */}

          <div>
            <Label>Unloading Point *</Label>
            <Select value={formData.unloading_point_id} onValueChange={handleUnloadingPointChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {formData.unloading_point_type === 'Depot' 
                  ? depots.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))
                  : companies.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))
                }
              </SelectContent>
            </Select>
          </div>

          {/* Weights */}         

          <div>
            <Label htmlFor="quantity_mt">Quantity (MT) *</Label>
            <Input
              id="quantity_mt"
              type="number"
              step="0.001"
              value={formData.quantity_mt}
              onChange={(e) => setFormData({ ...formData, quantity_mt: e.target.value })}
              placeholder="e.g., 50"
              data-testid="lifting-quantity-input"
            />
          </div>
        </div>
        )}
        <div className="mt-4">
          <FileUpload
            label="Invoice / Weight Slip"
            value={formData.weight_slip}
            onChange={(fileId) =>
              setFormData({
                ...formData,
                weight_slip: fileId
              })
            }
            accept="image/*,.pdf"
          />
        </div>
      </FormModal>

      <DeleteDialog
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setSelectedItem(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Lifting"
        description={
          selectedItem?.unloading_status === 'Verified' 
            ? `This lifting "${selectedItem?.lifting_no}" is VERIFIED. Are you sure you want to delete it? This action cannot be undone.`
            : `Are you sure you want to delete lifting "${selectedItem?.lifting_no}"? This action cannot be undone.`
        }
        loading={saving}
      />
    </PageLayout>
  );
}
