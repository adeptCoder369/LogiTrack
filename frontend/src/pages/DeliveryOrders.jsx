import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
import { deliveryOrdersApi, productsApi, companiesApi, depotsApi, railwaySidingsApi, exportApi, liftingsApi, getFileUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { validators } from '../lib/validation';
import { usePermissions } from '../lib/permissions';
import { formatIndianNumber } from '../lib/utils';
import { toast } from 'sonner';
import { Plus, Download, Truck, Train, Filter, X, Search, ClipboardList, Package, TrendingUp, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { DeliveryOrdersDataTable } from '@/components/deliveryOrders/DataTable';
import { Can } from '../components/Can';

export default function DeliveryOrders() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedDO = searchParams.get('do') || '';
  const [orders, setOrders] = useState([]);
  const [liftings, setLiftings] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [depots, setDepots] = useState([]);
  const [sidings, setSidings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const { hasPermission } = usePermissions();
  const [expandedPrimaryBreakdown, setExpandedPrimaryBreakdown] = useState(false);

  // Company search state
  const [companySearch, setCompanySearch] = useState('');
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);

  const [filters, setFilters] = useState({
    status: 'all',
    productIds: [],
    transportMode: 'all',
    searchTerm: preselectedDO
  });
  const [formData, setFormData] = useState({
    transport_mode: 'Road',
    from_company_id: '',
    from_company_name: '',
    product_id: '',
    product_name: '',
    product_code: '',
    total_quantity_mt: '',
    destination_type: 'Depot',
    to_depot_id: '',
    to_depot_name: '',
    to_company_id: '',
    to_company_name: '',
    loading_siding_id: '',
    loading_siding_name: '',
    loading_siding_code: '',
    destination_siding_id: '',
    destination_siding_name: '',
    destination_siding_code: '',
    remarks: '',
    do_copy_file_id: null,
    client_do_number: '',
    client_do_date: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (preselectedDO) {
      setShowFilters(true);
    }
  }, [preselectedDO]);

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes, companiesRes, depotsRes, sidingsRes, liftingsRes] = await Promise.all([
        deliveryOrdersApi.getAll(),
        productsApi.getAll(),
        companiesApi.getAll(),
        depotsApi.getAll(),
        railwaySidingsApi.getAll(),
        liftingsApi.getAll()
      ]);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
      setCompanies(companiesRes.data);
      setDepots(depotsRes.data);
      setSidings(sidingsRes.data);
      setLiftings(liftingsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  console.log('liftings ==', liftings);
  const handleAdd = () => {
    setSelectedItem(null);
    setCompanySearch('');
    setCompanyDropdownOpen(false);
    setFormData({
      transport_mode: 'Road',
      from_company_id: '',
      from_company_name: '',
      product_id: '',
      product_name: '',
      product_code: '',
      total_quantity_mt: '',
      destination_type: 'Depot',
      to_depot_id: '',
      to_depot_name: '',
      to_company_id: '',
      to_company_name: '',
      loading_siding_id: '',
      loading_siding_name: '',
      loading_siding_code: '',
      destination_siding_id: '',
      destination_siding_name: '',
      destination_siding_code: '',
      remarks: '',
      do_copy_file_id: null,
      client_do_number: '',
      client_do_date: '',
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setCompanySearch('');
    setCompanyDropdownOpen(false);
    setFormData({
      transport_mode: item.transport_mode || 'Road',
      from_company_id: item.from_company_id || '',
      from_company_name: item.from_company_name || '',
      product_id: item.product_id || '',
      product_name: item.product_name || '',
      product_code: item.product_code || '',
      total_quantity_mt: item.total_quantity_mt || '',
      destination_type: item.destination_type || 'Depot',
      to_depot_id: item.to_depot_id || '',
      to_depot_name: item.to_depot_name || '',
      to_company_id: item.to_company_id || '',
      to_company_name: item.to_company_name || '',
      loading_siding_id: item.loading_siding_id || '',
      loading_siding_name: item.loading_siding_name || '',
      loading_siding_code: item.loading_siding_code || '',
      destination_siding_id: item.destination_siding_id || '',
      destination_siding_name: item.destination_siding_name || '',
      destination_siding_code: item.destination_siding_code || '',
      remarks: item.remarks || '',
      do_copy_file_id: item.do_copy_file_id || null,
      client_do_number: item.client_do_number || '',
      client_do_date: item.client_do_date || '',
    });
    setModalOpen(true);
  };

  const columns = [
    {
      key: 'do_order_no',
      label: 'DO Number',
      render: (v, row) => (
        <a href={`/liftings?do=${v}`} className="mono font-medium text-blue-600 hover:underline">
          {row.client_do_number || v}
        </a>
      )
    },
    {
      key: 'do_copy_file_id', label: 'DO Copy', render: (v, row) => v ? (
        <a href={getFileUrl(v)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
          View
        </a>
      ) : (
        <Can action="update_delivery_order">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row)}
          >
            Add DO Copy
          </Button>
        </Can>
      )
    },
    {
      key: 'do_date', label: 'Date', render: (v, row) => {
        const dateStr = row.client_do_date || v;
        return dateStr ? new Date(dateStr).toLocaleDateString('en-IN') : '-';
      }
    },
    {
      key: 'transport_mode', label: 'Mode', render: (v) => (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${v === 'Railway' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
          }`}>
          {v === 'Railway' ? <Train className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
          {v || 'Road'}
        </span>
      )
    },
    { key: 'from_company_name', label: 'Source' },
    {
      key: 'destination',
      label: 'Destination',
      render: (v, row) => {
        const destType = row.destination_type || 'Depot';
        const typeColor = destType === 'Company'
          ? 'bg-purple-100 text-purple-700 border-purple-200'
          : destType === 'Both'
            ? 'bg-blue-100 text-blue-700 border-blue-200'
            : 'bg-slate-100 text-slate-700 border-slate-200';
        let nameDisplay;
        if (destType === 'Depot') {
          nameDisplay = row.to_depot_name || '-';
        } else if (destType === 'Company') {
          nameDisplay = row.to_company_name || '-';
        } else {
          nameDisplay = (
            <div className="text-xs space-y-0.5">
              <div>Depot: {row.to_depot_name || '-'}</div>
              <div className="text-gray-500">Company: {row.to_company_name || '-'}</div>
            </div>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            <span className="font-medium">{nameDisplay}</span>
            <span className={`inline-flex self-start text-[10px] font-semibold px-1.5 py-0.5 rounded border ${typeColor}`}>
              {destType}
            </span>
          </div>
        );
      }
    },
    { key: 'product_name', label: 'Product' },
    { key: 'total_quantity_mt', label: 'Total Qty', render: (v) => <span className="font-medium">{formatIndianNumber(v)} MT</span> },
    // { key: 'lifted_quantity_mt', label: 'Lifted', render: (v) => <span className="text-green-600">{v || 0} MT</span> },
    // { key: 'remaining_quantity_mt', label: 'Remaining', render: (v) => <span className="text-orange-600">{v || 0} MT</span> },



    {
      key: 'lifted_quantity_mt',
      label: 'Lifting Progress',
      render: (_, row) => {
        const total = Number(row.total_quantity_mt) || 0;
        const lifted = Number(row.lifted_quantity_mt) || 0;
        const remaining = Number(row.remaining_quantity_mt) || 0;

        // Calculate raw percentage without capping it at 100%
        const percentage = total > 0 ? Math.round((lifted / total) * 100) : 0;

        // Determine status flags
        const isExceeded = lifted > total;
        const isFullyLifted = lifted === total;

        // Dynamic color shifting based on status
        let barColor = 'bg-blue-600'; // Default in progress
        if (isExceeded) {
          barColor = 'bg-red-600'; // Red alert for exceeded limits
        } else if (isFullyLifted) {
          barColor = 'bg-emerald-600'; // Emerald green for perfect completion
        }

        // Cap the physical visual width at 100% so the bar doesn't overflow the UI container
        const visualWidth = Math.min(percentage, 100);

        return (
          <div className="w-full max-w-[160px] min-w-[120px] py-1">
            {/* Label breakdown */}
            <div className="flex justify-between items-end text-[11px] mb-1 text-gray-500 font-medium">
              <span>{formatIndianNumber(lifted)} / {formatIndianNumber(total)} MT</span>
              {/* Displays actual percentage, even if over 100% */}
              <span className={`font-semibold text-xs ${isExceeded ? 'text-red-600' : 'text-gray-700'}`}>
                {percentage}%
              </span>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`${barColor} h-full rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${visualWidth}%` }}
              />
            </div>

            {/* Subtext conditional message */}
            <div className="text-[10px] mt-0.5 text-right font-medium">
              {isExceeded ? (
                <span className="text-red-600 font-semibold">Lifting Exceeded</span>
              ) : remaining > 0 ? (
                <span className="text-orange-600">{formatIndianNumber(remaining)} MT remaining</span>
              ) : (
                <span className="text-emerald-600">Fully Lifted</span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'added_by_name', label: 'Added By', render: (v, row) => (
        <div className="text-sm">
          <p className="text-gray-700">{v || '-'}</p>
          {row.created_at && (
            <p className="text-gray-400 text-[10px]">
              {new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}, {new Date(row.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'status', label: 'Status', render: (v) => (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${v === 'Completed' ? 'bg-green-100 text-green-800' :
          v === 'In Progress' ? 'bg-blue-100 text-blue-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>{v}</span>
      )
    },
  ];

  // Filter companies based on search query
  const filteredCompanies = companies.filter(c =>
    c.name?.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.trade_name?.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.city?.toLowerCase().includes(companySearch.toLowerCase()) ||
    c.gst_number?.toLowerCase().includes(companySearch.toLowerCase())
  );

  // Handle selecting a company
  const handleCompanySelect = (company) => {
    setFormData({
      ...formData,
      from_company_id: company.id,
      from_company_name: company.name,
    });
    setCompanySearch(company.name);
    setCompanyDropdownOpen(false);
  };

  // Clear company selection
  const clearCompanySelection = () => {
    setCompanySearch('');
    setFormData({
      ...formData,
      from_company_id: '',
      from_company_name: '',
    });
  };

  const handleCompanyChange = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    setFormData({
      ...formData,
      from_company_id: companyId,
      from_company_name: company?.name || '',
    });
  };

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    setFormData({
      ...formData,
      product_id: productId,
      product_name: product?.product_name || '',
      product_code: product?.product_code || '',
    });
  };

  const handleDepotChange = (depotId) => {
    const depot = depots.find(d => d.id === depotId);
    setFormData({
      ...formData,
      to_depot_id: depotId,
      to_depot_name: depot?.name || '',
    });
  };

  const handleDestinationCompanyChange = (companyId) => {
    const company = companies.find(c => c.id === companyId);
    setFormData({
      ...formData,
      to_company_id: companyId,
      to_company_name: company?.name || '',
    });
  };

  const handleLoadingSidingChange = (sidingId) => {
    const siding = sidings.find(s => s.id === sidingId);
    setFormData({
      ...formData,
      loading_siding_id: sidingId,
      loading_siding_name: siding?.siding_name || '',
      loading_siding_code: siding?.siding_code || '',
    });
  };

  const handleDestinationSidingChange = (sidingId) => {
    const siding = sidings.find(s => s.id === sidingId);
    setFormData({
      ...formData,
      destination_siding_id: sidingId,
      destination_siding_name: siding?.siding_name || '',
      destination_siding_code: siding?.siding_code || '',
    });
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const handleExport = () => {
    window.open(exportApi.deliveryOrders(), '_blank');
    toast.success('Export started');
  };

  const handleSubmit = async () => {
    // Validation
    const errors = [];

    if (!formData.product_id) {
      errors.push('Product is required');
    }

    if (!formData.total_quantity_mt) {
      errors.push('Quantity is required');
    } else {
      const qtyError = validators.quantity(formData.total_quantity_mt, 'Quantity');
      if (qtyError) errors.push(qtyError);
    }

    if (formData.transport_mode === 'Road' && !formData.to_depot_id && !formData.to_company_id) {
      errors.push('Please select destination depot or company for Road mode');
    }

    if (formData.transport_mode === 'Road' && formData.destination_type === 'Depot' && !formData.to_depot_id) {
      errors.push('Please select destination depot for Road mode');
    }

    if (formData.transport_mode === 'Road' && formData.destination_type === 'Company' && !formData.to_company_id) {
      errors.push('Please select destination company for Road mode');
    }

    if (formData.transport_mode === 'Road' && formData.destination_type === 'Both' && (!formData.to_depot_id || !formData.to_company_id)) {
      errors.push('Please select both depot and company for Road mode');
    }

    if (formData.transport_mode === 'Railway') {
      if (!formData.loading_siding_id) {
        errors.push('Please select Loading Siding for Railway mode');
      }
      if (!formData.destination_siding_id) {
        errors.push('Please select Destination Siding for Railway mode');
      }
    }

    if (errors.length > 0) {
      errors.forEach(err => toast.error(err));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        total_quantity_mt: parseFloat(formData.total_quantity_mt),
        client_do_number: formData.client_do_number?.trim() || undefined,
        client_do_date: formData.client_do_date || undefined,
      };
      if (selectedItem) {
        await deliveryOrdersApi.update(selectedItem.id, payload);
        toast.success('Delivery Order updated successfully');
      } else {
        await deliveryOrdersApi.create(payload);
        toast.success('Delivery Order created successfully');
      }
      setModalOpen(false);
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      toast.error(selectedItem ? 'Failed to update delivery order' : 'Failed to create delivery order');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await deliveryOrdersApi.delete(selectedItem.id);
      toast.success('Delivery Order deleted');
      setDeleteOpen(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (filters.status !== 'all' && order.status !== filters.status) return false;
    if (
      filters.productIds.length > 0 &&
      !filters.productIds.includes(order.product_id)
    ) {
      return false;
    }
    if (filters.transportMode !== 'all' && order.transport_mode !== filters.transportMode) return false;
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      return (
        order.do_order_no?.toLowerCase().includes(search) ||
        order.client_do_number?.toLowerCase().includes(search) ||
        order.product_name?.toLowerCase().includes(search) ||
        order.from_company_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const clearFilters = () => {
    setFilters({
      status: 'all',
      productIds: [],
      transportMode: 'all',
      searchTerm: ''
    });
  };

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.productIds.length > 0 ||
    filters.transportMode !== 'all' ||
    filters.searchTerm;

  // Compute liftings that belong to the currently filtered DOs so the summary
  // reflects the active filters. We match against common DO fields returned
  // by the liftings API (`delivery_order_no`, `purchase_order_no`, `lifting_no`).
  const doNumbersSet = new Set(filteredOrders.map(o => o.do_order_no));
  const liftingsFromDOs = liftings.filter(l => {
    if (l.lifting_type !== 'Primary') return false;
    const doRefCandidates = [l.delivery_order_no, l.purchase_order_no, l.lifting_no];
    return doRefCandidates.some(c => c && doNumbersSet.has(String(c)));
  });

  const totalLiftingsFromDOs = liftingsFromDOs.length;

  // Primary liftings breakdown by type and status
  const primaryDepotFromDOs = liftingsFromDOs.filter(l => l.unloading_point_type === 'Depot');
  const primaryCompanyFromDOs = liftingsFromDOs.filter(l => l.unloading_point_type === 'Company');

  const depotVerified = primaryDepotFromDOs.filter(l => l.unloading_status === 'Verified').reduce((sum, l) => sum + (l.quantity_mt || 0), 0);
  const depotPending = primaryDepotFromDOs.filter(l => l.unloading_status === 'Pending').reduce((sum, l) => sum + (l.quantity_mt || 0), 0);
  const depotRejected = primaryDepotFromDOs.filter(l => l.unloading_status === 'Rejected').reduce((sum, l) => sum + (l.quantity_mt || 0), 0);

  const companyVerified = primaryCompanyFromDOs.filter(l => l.unloading_status === 'Verified').reduce((sum, l) => sum + (l.quantity_mt || 0), 0);
  const companyPending = primaryCompanyFromDOs.filter(l => l.unloading_status === 'Pending').reduce((sum, l) => sum + (l.quantity_mt || 0), 0);
  const companyRejected = primaryCompanyFromDOs.filter(l => l.unloading_status === 'Rejected').reduce((sum, l) => sum + (l.quantity_mt || 0), 0);

  const depotSumFromDOs = depotVerified + depotPending;
  const companySumFromDOs = companyVerified + companyPending;

  const canCreateDO = hasPermission('Delivery Orders (Create)');
  const canDeleteDO = hasPermission('Delivery Orders (Delete)');

  return (
    <PageLayout
      title="Purchase DO"
      subtitle="Master records for product purchased from different companies"
      actions={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-blue-500 text-blue-600' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters {hasActiveFilters && `(${filteredOrders.length}/${orders.length})`}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
          <Can action="create_delivery_order">
            <Button onClick={handleAdd} className="bg-orange-500 hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Create Purchase DO
            </Button>
          </Can>
        </div>
      }
    >
      {/* Filters */}
      {showFilters && (
        <Card className="mb-4">
          <CardContent className="pt-4">
            <div className="flex items-center flex-wrap gap-4">
              <div className="flex items-center gap-2 min-w-[200px]">
                <Search className="w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search DO#, product, company..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="h-9"
                />
              </div>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <div className="min-w-[260px]">
                <Label className="text-xs text-gray-500 mb-1 block">Products</Label>

                <div className="border rounded-md p-2 max-h-40 overflow-y-auto bg-white">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {filters.productIds.length > 0 ? (
                      filters.productIds.map(id => {
                        const product = products.find(p => p.id === id);

                        return (
                          <div
                            key={id}
                            className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs"
                          >
                            {product?.product_name}

                            <button
                              type="button"
                              onClick={() =>
                                setFilters({
                                  ...filters,
                                  productIds: filters.productIds.filter(p => p !== id)
                                })
                              }
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-xs text-gray-400">All Products</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {products.map(product => (
                      <label
                        key={product.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.productIds.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters({
                                ...filters,
                                productIds: [...filters.productIds, product.id]
                              });
                            } else {
                              setFilters({
                                ...filters,
                                productIds: filters.productIds.filter(id => id !== product.id)
                              });
                            }
                          }}
                        />

                        <span>{product.product_name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <Select value={filters.transportMode} onValueChange={(v) => setFilters({ ...filters, transportMode: v })}>
                <SelectTrigger className="w-36 h-9">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="Road">Road</SelectItem>
                  <SelectItem value="Railway">Railway</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-600">
                  <X className="w-4 h-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Orders with Status Breakdown */}
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total Delivery Orders</p>
                <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  {filteredOrders.length}
                </p>
                {hasActiveFilters && <p className="text-xs text-gray-400">of {orders.length} total</p>}
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <ClipboardList className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="border-t pt-3 mt-2">
              <p className="text-xs font-semibold text-gray-500 mb-1.5">By Status</p>
              <div className="grid grid-cols-3 gap-1 text-xs">
                <div className="bg-yellow-50 rounded px-2 py-1 text-center">
                  <span className="font-semibold text-yellow-700">{filteredOrders.filter(o => o.status === 'Open').length}</span>
                  <span className="text-gray-500 block">Open</span>
                </div>
                <div className="bg-blue-50 rounded px-2 py-1 text-center">
                  <span className="font-semibold text-blue-700">{filteredOrders.filter(o => o.status === 'In Progress').length}</span>
                  <span className="text-gray-500 block">In Progress</span>
                </div>
                <div className="bg-green-50 rounded px-2 py-1 text-center">
                  <span className="font-semibold text-green-700">{filteredOrders.filter(o => o.status === 'Completed').length}</span>
                  <span className="text-gray-500 block">Completed</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Total Quantity with Lifted Breakdown */}



        {/* Total Quantity with Lifted Breakdown */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Total DO Quantity</p>
                <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  {formatIndianNumber(filteredOrders.reduce((sum, o) => sum + (o.total_quantity_mt || 0), 0))}
                  <span className="text-sm font-normal text-gray-400 ml-1">MT</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Lifted vs Remaining Progress Bars Block */}
            <div className="border-t pt-3 mt-2 space-y-4">

              {/* Overall Progress Indicator */}
              {(() => {
                const totalLifted = filteredOrders.reduce((sum, o) => sum + (o.lifted_quantity_mt || 0), 0);
                const totalQty = filteredOrders.reduce((sum, o) => sum + (o.total_quantity_mt || 0), 0);
                const totalRemaining = filteredOrders.reduce((sum, o) => sum + (o.remaining_quantity_mt || 0), 0);

                // Calculate percentages safely
                const rawPercentage = totalQty > 0 ? (totalLifted / totalQty) * 100 : 0;
                const displayPercentage = Math.min(Math.round(rawPercentage), 100);
                const isExceeded = totalLifted > totalQty;

                return (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 font-medium">
                        {formatIndianNumber(totalLifted)} / {formatIndianNumber(totalQty)} MT
                      </span>
                      <span className={`font-bold ${isExceeded ? 'text-red-600' : 'text-slate-700'}`}>
                        {Math.round(rawPercentage)}%
                      </span>
                    </div>

                    {/* Progress track wrapper */}
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${isExceeded ? 'bg-red-500' : displayPercentage === 100 ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                        style={{ width: `${Math.min(rawPercentage, 100)}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Overall Progress</span>
                      {isExceeded ? (
                        <span className="text-red-600 font-semibold animate-pulse">Dispatch Exceeded</span>
                      ) : displayPercentage === 100 ? (
                        <span className="text-green-600 font-medium">Fully Dispatched</span>
                      ) : (
                        <span className="text-orange-600 font-medium">{formatIndianNumber(totalRemaining)} MT remaining</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Product Wise Breakdown */}
              <div className="pt-1">
                <p className="text-xs font-semibold text-gray-500 mb-2">
                  Product-wise Quantity Progress
                </p>

                <div className="space-y-3 max-h-44 overflow-y-auto pr-1">
                  {products
                    .filter(product =>
                      filteredOrders.some(o => o.product_id === product.id)
                    )
                    .map(product => {
                      const productOrders = filteredOrders.filter(
                        o => o.product_id === product.id
                      );

                      const lifted = productOrders.reduce((sum, o) => sum + (o.lifted_quantity_mt || 0), 0);
                      const remaining = productOrders.reduce((sum, o) => sum + (o.remaining_quantity_mt || 0), 0);
                      const total = productOrders.reduce((sum, o) => sum + (o.total_quantity_mt || 0), 0);

                      const rawProductPercentage = total > 0 ? (lifted / total) * 100 : 0;
                      const displayProductPercentage = Math.min(Math.round(rawProductPercentage), 100);
                      const isProductExceeded = lifted > total;

                      return (
                        <div key={product.id} className="border rounded-md p-2 bg-gray-50 space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-medium text-gray-700 truncate max-w-[140px]">
                              {product.product_name}
                            </span>
                            <span className="text-gray-500 font-mono text-xs">
                              {formatIndianNumber(lifted)}/{formatIndianNumber(total)} MT
                            </span>
                          </div>

                          {/* Tiny item progress track */}
                          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${isProductExceeded ? 'bg-red-500' : displayProductPercentage === 100 ? 'bg-green-500' : 'bg-emerald-500'
                                }`}
                              style={{ width: `${Math.min(rawProductPercentage, 100)}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <span className={`font-semibold ${isProductExceeded ? 'text-red-500' : 'text-gray-500'}`}>
                              {Math.round(rawProductPercentage)}% Loaded
                            </span>
                            {isProductExceeded ? (
                              <span className="text-red-600 font-bold">Exceeded</span>
                            ) : displayProductPercentage === 100 ? (
                              <span className="text-green-600 font-medium">Done</span>
                            ) : (
                              <span className="text-gray-400">{formatIndianNumber(remaining)} MT left</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Total DO Quantity</p>
                <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  {formatIndianNumber(filteredOrders.reduce((sum, o) => sum + (o.total_quantity_mt || 0), 0))}
                  <span className="text-sm font-normal text-gray-400 ml-1">MT</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="border-t pt-3 mt-2 space-y-3">

              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-green-50 rounded px-2 py-1.5">
                  <span className="text-gray-500">Lifted: </span>
                  <span className="font-semibold text-green-700">
                    {formatIndianNumber(filteredOrders.reduce((sum, o) => sum + (o.lifted_quantity_mt || 0), 0))} MT
                  </span>
                </div>

                <div className="bg-orange-50 rounded px-2 py-1.5">
                  <span className="text-gray-500">Remaining: </span>
                  <span className="font-semibold text-orange-700">
                    {formatIndianNumber(filteredOrders.reduce((sum, o) => sum + (o.remaining_quantity_mt || 0), 0))} MT
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold text-gray-500 mb-2">
                  Product-wise Quantity
                </p>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {products
                    .filter(product =>
                      filteredOrders.some(o => o.product_id === product.id)
                    )
                    .map(product => {
                      const productOrders = filteredOrders.filter(
                        o => o.product_id === product.id
                      );

                      const lifted = productOrders.reduce(
                        (sum, o) => sum + (o.lifted_quantity_mt || 0),
                        0
                      );

                      const remaining = productOrders.reduce(
                        (sum, o) => sum + (o.remaining_quantity_mt || 0),
                        0
                      );

                      const total = productOrders.reduce(
                        (sum, o) => sum + (o.total_quantity_mt || 0),
                        0
                      );

                      return (
                        <div
                          key={product.id}
                          className="border rounded-md px-2 py-1.5 bg-gray-50"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[11px] font-medium text-gray-700 truncate">
                              {product.product_name}
                            </span>

                            <span className="text-[10px] text-gray-500">
                              {formatIndianNumber(total)} MT
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="text-green-700 font-medium">
                              Lifted: {formatIndianNumber(lifted)} MT
                            </div>

                            <div className="text-orange-700 font-medium text-right">
                              Remaining: {formatIndianNumber(remaining)} MT
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card> */}

        {/* Liftings Bifurcation */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Liftings from DOs</p>
                <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
                  <span className="text-gray-500 flex items-center gap-1"><Truck className="w-8 h-8" /> {totalLiftingsFromDOs} </span>


                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Primary Bifurcation */}
            <div className="border-t pt-3 mt-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-purple-600">Primary Liftings</p>
                <button
                  type="button"
                  onClick={() => setExpandedPrimaryBreakdown(!expandedPrimaryBreakdown)}
                  className="p-1 hover:bg-purple-100 rounded"
                  title="Show breakdown"
                >
                  {expandedPrimaryBreakdown ? (
                    <ChevronUp className="w-3 h-3 text-purple-600" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-purple-600" />
                  )}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <div className="bg-blue-50 rounded px-2 py-1">
                  <span className="text-gray-500">Co.→Depot: </span>
                  <span className="font-semibold text-blue-700">
                    {formatIndianNumber(depotSumFromDOs)} MT
                  </span>
                </div>
                <div className="bg-green-50 rounded px-2 py-1">
                  <span className="text-gray-500">Co.→Client: </span>
                  <span className="font-semibold text-green-700">
                    {formatIndianNumber(companySumFromDOs)} MT
                  </span>
                </div>
              </div>

              {/* Expanded Breakdown */}
              {expandedPrimaryBreakdown && (
                <div className="mt-2 pt-2 border-t border-purple-200">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-blue-600 mb-1">To Depot Breakdown</p>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="bg-green-50 rounded px-1.5 py-0.5">
                        <span className="text-green-700">Verified: </span>
                        <span className="font-bold text-green-800">{formatIndianNumber(depotVerified)} MT</span>
                      </div>
                      <div className="bg-yellow-50 rounded px-1.5 py-0.5">
                        <span className="text-yellow-700">Pending: </span>
                        <span className="font-bold text-yellow-800">{formatIndianNumber(depotPending)} MT</span>
                      </div>
                      <div className="bg-red-50 rounded px-1.5 py-0.5">
                        <span className="text-red-700">Rejected: </span>
                        <span className="font-bold text-red-800">{formatIndianNumber(depotRejected)} MT</span>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-green-600 mb-1 mt-1">To Client Breakdown</p>
                    <div className="grid grid-cols-3 gap-1 text-xs">
                      <div className="bg-green-50 rounded px-1.5 py-0.5">
                        <span className="text-green-700">Verified: </span>
                        <span className="font-bold text-green-800">{formatIndianNumber(companyVerified)} MT</span>
                      </div>
                      <div className="bg-yellow-50 rounded px-1.5 py-0.5">
                        <span className="text-yellow-700">Pending: </span>
                        <span className="font-bold text-yellow-800">{formatIndianNumber(companyPending)} MT</span>
                      </div>
                      <div className="bg-red-50 rounded px-1.5 py-0.5">
                        <span className="text-red-700">Rejected: </span>
                        <span className="font-bold text-red-800">{formatIndianNumber(companyRejected)} MT</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>


      <DeliveryOrdersDataTable
        columns={columns}
        data={filteredOrders}
        loading={loading}
        onDelete={hasPermission('Delivery Orders (Delete)') ? handleDelete : undefined}
        emptyMessage="No delivery orders found. Create your first order!"

      />

      {/* <DataTable
        columns={columns}
        data={filteredOrders}
        loading={loading}
        onDelete={canDeleteDO ? handleDelete : null}
        emptyMessage="No delivery orders found. Create your first order!"
      /> */}

      <FormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedItem(null);
        }}
        title={selectedItem ? 'Update Delivery Order' : 'Create Purchase DO'}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel={selectedItem ? 'Save Changes' : 'Create Order'}
      >
        <div className="space-y-4">
          {/* Transport Mode Selection */}
          <div>
            <Label>Transportation Mode *</Label>
            <div className="flex gap-2 mt-2">
              <Button
                type="button"
                variant={formData.transport_mode === 'Road' ? 'default' : 'outline'}
                className={`flex-1 ${formData.transport_mode === 'Road' ? 'bg-blue-600' : ''}`}
                onClick={() => setFormData({ ...formData, transport_mode: 'Road' })}
              >
                <Truck className="w-4 h-4 mr-2" />
                Road (Truck)
              </Button>
              <Button
                type="button"
                variant={formData.transport_mode === 'Railway' ? 'default' : 'outline'}
                className={`flex-1 ${formData.transport_mode === 'Railway' ? 'bg-purple-600' : ''}`}
                onClick={() => setFormData({ ...formData, transport_mode: 'Railway' })}
              >
                <Train className="w-4 h-4 mr-2" />
                Railway (Rake)
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 relative">
              <Label>From Company (Source) *</Label>
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search company by name, trade name, city, GST..."
                    value={companySearch}
                    onChange={(e) => {
                      setCompanySearch(e.target.value);
                      setCompanyDropdownOpen(true);
                    }}
                    onFocus={() => setCompanyDropdownOpen(true)}
                    className="pl-9 pr-8"
                    data-testid="do-company-search"
                  />
                  {companySearch && (
                    <button
                      type="button"
                      onClick={clearCompanySelection}
                      className="absolute right-2 p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>

                {/* Dropdown */}
                {companyDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredCompanies.length > 0 ? (
                      <>
                        <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                          {companySearch ? `Matching companies (${filteredCompanies.length})` : `All companies (${companies.length})`}
                        </div>
                        {filteredCompanies.slice(0, 50).map((company) => (
                          <div
                            key={company.id}
                            onClick={() => handleCompanySelect(company)}
                            className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${formData.from_company_id === company.id ? 'bg-blue-100' : ''
                              }`}
                          >
                            <div className="flex items-center gap-2">
                              {company.logo_file_id ? (
                                <img
                                  src={getFileUrl(company.logo_file_id)}
                                  alt={company.name}
                                  className="w-6 h-6 rounded-full object-cover shrink-0"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 shrink-0" />
                              )}
                              <div>
                                <p className="font-medium text-sm">{company.name}</p>
                                <p className="text-xs text-gray-500">
                                  {[company.city, company.state].filter(Boolean).join(', ')}
                                  {company.gst_number && ` • GST: ${company.gst_number}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredCompanies.length > 50 && (
                          <div className="px-3 py-2 text-xs text-gray-500 text-center border-t">
                            Showing first 50 results. Type more to narrow down.
                          </div>
                        )}
                      </>
                    ) : companySearch ? (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No matching companies found
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-sm text-gray-500">
                        No companies available
                      </div>
                    )}

                    {/* Close button */}
                    <div
                      onClick={() => setCompanyDropdownOpen(false)}
                      className="px-3 py-1.5 text-xs text-center text-gray-500 bg-gray-50 border-t cursor-pointer hover:bg-gray-100"
                    >
                      Close
                    </div>
                  </div>
                )}
              </div>

              {/* Selected company info */}
              {formData.from_company_id && (() => {
                const selectedCompany = companies.find((c) => c.id === formData.from_company_id);
                return (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Selected: {selectedCompany?.logo_file_id && (
                      <img
                        src={getFileUrl(selectedCompany.logo_file_id)}
                        alt={formData.from_company_name}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                    )}
                    <span className="font-medium">{formData.from_company_name}</span>
                  </p>
                );
              })()}
            </div>

            <div className="col-span-2">
              <Label>Product *</Label>
              <Select value={formData.product_id} onValueChange={handleProductChange}>
                <SelectTrigger data-testid="do-product-select">
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.product_name} {p.product_code && `(${p.product_code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="total_quantity_mt">Total Quantity (MT) *</Label>
              <Input
                id="total_quantity_mt"
                type="number"
                step="0.001"
                value={formData.total_quantity_mt}
                onChange={(e) => setFormData({ ...formData, total_quantity_mt: e.target.value })}
                placeholder="e.g., 10000"
                data-testid="do-quantity-input"
              />
            </div>

{formData.transport_mode === 'Road' && (
               <div className="col-span-2 space-y-3">
                 <div>
                   <Label>Destination Type *</Label>
                   <Select value={formData.destination_type} onValueChange={(v) => setFormData({ ...formData, destination_type: v, to_depot_id: '', to_depot_name: '', to_company_id: '', to_company_name: '' })}>
                     <SelectTrigger>
                       <SelectValue placeholder="Select destination type" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="Depot">To Depot</SelectItem>
                       <SelectItem value="Company">To Company</SelectItem>
                       {/* <SelectItem value="Both">Both (Depot & Company)</SelectItem> */}
                     </SelectContent>
                   </Select>
                 </div>

                 {formData.destination_type === 'Depot' && (
                   <div>
                     <Label>To Depot (Destination) *</Label>
                     <Select value={formData.to_depot_id} onValueChange={handleDepotChange}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select destination depot" />
                       </SelectTrigger>
                       <SelectContent>
                         {depots.map((d) => (
                           <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}

                 {formData.destination_type === 'Company' && (
                   <div>
                     <Label>To Company (Client) *</Label>
                     <Select value={formData.to_company_id} onValueChange={handleDestinationCompanyChange}>
                       <SelectTrigger>
                         <SelectValue placeholder="Select destination company" />
                       </SelectTrigger>
                       <SelectContent>
                         {companies.map((c) => (
                           <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}

                 {formData.destination_type === 'Both' && (
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <Label>To Depot *</Label>
                       <Select value={formData.to_depot_id} onValueChange={handleDepotChange}>
                         <SelectTrigger>
                           <SelectValue placeholder="Select depot" />
                         </SelectTrigger>
                         <SelectContent>
                           {depots.map((d) => (
                             <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                     <div>
                       <Label>To Company (Client) *</Label>
                       <Select value={formData.to_company_id} onValueChange={handleDestinationCompanyChange}>
                         <SelectTrigger>
                           <SelectValue placeholder="Select company" />
                         </SelectTrigger>
                         <SelectContent>
                           {companies.map((c) => (
                             <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </div>
                   </div>
                 )}
               </div>
             )}
          </div>

          {/* Railway Siding Fields */}
          {formData.transport_mode === 'Railway' && (
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-purple-700 mb-3 flex items-center gap-2">
                <Train className="w-4 h-4" />
                Railway Siding Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Loading Point Siding *</Label>
                  <Select value={formData.loading_siding_id} onValueChange={handleLoadingSidingChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select loading siding" />
                    </SelectTrigger>
                    <SelectContent>
                      {sidings.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.siding_name} ({s.siding_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.loading_siding_code && (
                    <p className="text-xs text-gray-500 mt-1">Code: <span className="mono font-medium">{formData.loading_siding_code}</span></p>
                  )}
                </div>
                <div>
                  <Label>Destination Siding *</Label>
                  <Select value={formData.destination_siding_id} onValueChange={handleDestinationSidingChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select destination siding" />
                    </SelectTrigger>
                    <SelectContent>
                      {sidings.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.siding_name} ({s.siding_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.destination_siding_code && (
                    <p className="text-xs text-gray-500 mt-1">Code: <span className="mono font-medium">{formData.destination_siding_code}</span></p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Client DO Number & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>DO Number</Label>
              <Input
                value={formData.client_do_number}
                onChange={(e) => setFormData({ ...formData, client_do_number: e.target.value })}
                placeholder="Enter client DO number (optional)"
              />
            </div>
            <div>
              <Label>DO Date</Label>
              <Input
                type="date"
                value={formData.client_do_date}
                onChange={(e) => setFormData({ ...formData, client_do_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Any additional notes"
            />
          </div>

          <div>
            <FileUpload
              value={formData.do_copy_file_id}
              onChange={(value) => setFormData({ ...formData, do_copy_file_id: value })}
              label="Upload DO Copy"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              showCameraOption={false}
            />
          </div>
        </div>
      </FormModal>

      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Delivery Order"
        description={`Delete order "${selectedItem?.do_order_no}"? This cannot be undone.`}
        loading={saving}
      />
    </PageLayout>
  );
}
