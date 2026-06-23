import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '../components/layout/PageLayout';
import { PurchaseOrdersDataTable } from '../components/purchaseOrder/DataTable';
import { FormModal } from '../components/shared/FormModal';
import { DeleteDialog } from '../components/shared/DeleteDialog';
import { FileUpload } from '../components/shared/FileUpload';
// import { ConfirmationDialogue } from '../components/ui/ConfirmationDialogue';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import FilterPanel from '../components/purchaseOrder/FilterPanel';
import { purchaseOrdersApi, productsApi, companiesApi, depotsApi, getFileUrl } from '../lib/api';
import { usePermissions } from '../lib/permissions';
import { toast } from 'sonner';
import { Plus, X, Pencil, CheckCircle, Download, FileText } from 'lucide-react';
import { ConfirmationDialogue } from '../components/ui/ConfirmationDialogue';
import { POStatementModal } from '@/components/purchaseOrder/POStatementModal';
import { Can } from '../components/Can';


export default function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const urlPoNumber = searchParams.get('poNumber') || searchParams.get('po') || '';
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [depots, setDepots] = useState([]);

  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementData, setStatementData] = useState(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmReason, setConfirmReason] = useState('');
  const [confirmRequiresReason, setConfirmRequiresReason] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenLoading, setReopenLoading] = useState(false);

  const [filters, setFilters] = useState({
    status: 'all',
    depotId: 'all',
    companyId: 'all',
    productId: 'all',
    poNumber: urlPoNumber,
    dateFrom: '',
    dateTo: ''
  });

  const { hasPermission } = usePermissions();

  const [formData, setFormData] = useState({
    source_type: 'Depot',
    source_company_id: '',
    depot_id: '',
    depot_name: '',
    to_company_id: '',
    to_company_name: '',
    product_id: '',
    product_name: '',
    product_code: '',
    total_quantity_mt: '',
    remarks: '',
    client_po_number: '',
    client_po_date: '',
    po_copy_file_id: null,
    estimated_completion_date: '',
    status: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, productsRes, companiesRes, depotsRes] = await Promise.all([
        purchaseOrdersApi.getAll(),
        productsApi.getAll(),
        companiesApi.getAll(),
        depotsApi.getAll()
      ]);

      setOrders(ordersRes.data);
      setProducts(productsRes.data);
      setCompanies(companiesRes.data);
      setDepots(depotsRes.data);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };
  console.log(' orders', filters)
  const openStatement = async (row) => {

    try {

      setStatementLoading(true);

      const res = await purchaseOrdersApi.getStatement(
        row.id
      );

      setStatementData(res.data);
      setStatementOpen(true);

    } catch {

      toast.error("Failed to load statement");

    } finally {

      setStatementLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setFormData({
      depot_id: '',
      depot_name: '',
      to_company_id: '',
      to_company_name: '',
      product_id: '',
      product_name: '',
      product_code: '',
      total_quantity_mt: '',
      remarks: '',
      client_po_number: '',
      client_po_date: '',
      po_copy_file_id: null,
      estimated_completion_date: '',
      status: ''
    });
    setModalOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!confirmRow) return;

    if (confirmRequiresReason && !confirmReason.trim()) {
      toast.error('Please provide a reason for closing early');
      return;
    }

    setConfirmLoading(true);

    try {
      await purchaseOrdersApi.complete(confirmRow.id, {
        completion_reason: confirmReason.trim() || undefined
      });
      toast.success('PO marked as completed');
      setConfirmOpen(false);
      setConfirmRow(null);
      setConfirmReason('');
      setConfirmRequiresReason(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to complete PO');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);

    setFormData({
      source_type: item.source_type || 'Depot',
      source_company_id: item.source_company_id || '',
      depot_id: item.depot_id || '',
      depot_name: item.depot_name || '',

      to_company_id: item.to_company_id || '',
      to_company_name: item.to_company_name || '',

      product_id: item.product_id || '',
      product_name: item.product_name || '',
      product_code: item.product_code || '',

      total_quantity_mt: item.total_quantity_mt || '',
      remarks: item.remarks || '',
      client_po_number: item.client_po_number || '',
      client_po_date: item.client_po_date || '',
      po_copy_file_id: item.po_copy_file_id || null,
      estimated_completion_date: item.estimated_completion_date || '',
      status: item.status || ''
    });

    setModalOpen(true);
  };

  const handleDepotChange = (id) => {
    const d = depots.find(x => x.id === id);
    setFormData({
      ...formData,
      depot_id: id,
      depot_name: d?.name || ''
    });
  };

  const handleCompanyChange = (id) => {
    const c = companies.find(x => x.id === id);
    setFormData({
      ...formData,
      to_company_id: id,
      to_company_name: c?.name || ''
    });
  };

  const handleSourceCompanyChange = (id) => {
    const c = companies.find(x => x.id === id);
    setFormData({
      ...formData,
      source_company_id: id,
      source_company_name: c?.name || ''
    });
  };

  const handleProductChange = (id) => {
    const p = products.find(x => x.id === id);
    setFormData({
      ...formData,
      product_id: id,
      product_name: p?.product_name || '',
      product_code: p?.product_code || ''
    });
  };

  const handleSubmit = async () => {
    if (
      !formData.product_id ||
      !formData.to_company_id ||
      !formData.total_quantity_mt ||
      ((formData.source_type === 'Depot' && !formData.depot_id) || (formData.source_type === 'Company' && !formData.source_company_id))
    ) {
      toast.error('Please fill required fields');
      return;
    }

    // Check if status is being changed from Completed to In Progress
    if (selectedItem) {
      const originalStatus = String(selectedItem.status || '').trim().toLowerCase();
      const newStatus = String(formData.status || '').trim().toLowerCase();

      if (originalStatus === 'completed' && newStatus === 'in progress') {
        setReopenOpen(true);
        return;
      }
    }

    await saveFormData();
  };

  const saveFormData = async () => {
    setSaving(true);

    try {

      const payload = {
        ...formData,
        total_quantity_mt: parseFloat(formData.total_quantity_mt),
        client_po_number: formData.client_po_number?.trim() || undefined,
        client_po_date: formData.client_po_date || undefined,
        po_copy_file_id: formData.po_copy_file_id || undefined,
        estimated_completion_date: formData.estimated_completion_date || undefined,
        status: formData.status || undefined
      };

      if (selectedItem) {
        await purchaseOrdersApi.update(
          selectedItem.id,
          payload
        );

        toast.success('Purchase Order updated');

      } else {

        await purchaseOrdersApi.create(payload);

        toast.success('Purchase Order created');
      }

      setModalOpen(false);
      fetchData();

    } catch (err) {

      toast.error(
        err?.response?.data?.detail ||
        'Failed to save PO'
      );

    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await purchaseOrdersApi.delete(selectedItem.id);
      toast.success('Deleted');
      setDeleteOpen(false);
      fetchData();
    } catch {
      toast.error('Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReopenConfirm = async () => {
    setReopenLoading(true);
    try {
      // When reopening, also clear the completion reason
      const updatedFormData = {
        ...formData,
        completion_reason: null
      };

      setSaving(true);
      const payload = {
        ...updatedFormData,
        total_quantity_mt: parseFloat(updatedFormData.total_quantity_mt),
        client_po_number: updatedFormData.client_po_number?.trim() || undefined,
        client_po_date: updatedFormData.client_po_date || undefined,
        po_copy_file_id: updatedFormData.po_copy_file_id || undefined,
        estimated_completion_date: updatedFormData.estimated_completion_date || undefined,
        status: updatedFormData.status || undefined,
        completion_reason: null
      };

      if (selectedItem) {
        await purchaseOrdersApi.update(selectedItem.id, payload);
        toast.success('Purchase Order reopened and updated');
      }

      setModalOpen(false);
      setReopenOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to reopen PO');
    } finally {
      setSaving(false);
      setReopenLoading(false);
    }
  };

  const isCompletedOrder = (order) => {

    return (

      String(order?.status || '').trim().toLowerCase() === 'completed'
    )
  }

  const filteredOrders = orders.filter(o => {
    if (filters.status !== 'all' && o.status !== filters.status) return false;
    if (filters.depotId !== 'all' && o.depot_id !== filters.depotId) return false;
    if (filters.companyId !== 'all' && o.to_company_id !== filters.companyId) return false;
    if (filters.productId !== 'all' && o.product_id !== filters.productId) return false;

    const orderDate = o.client_po_date ? new Date(o.client_po_date) : o.po_date ? new Date(o.po_date) : null;
    if (filters.dateFrom && (!orderDate || orderDate < new Date(filters.dateFrom))) return false;
    if (filters.dateTo && (!orderDate || orderDate > new Date(filters.dateTo))) return false;

    if (filters.poNumber) {
      const search = filters.poNumber.toLowerCase();
      return (
        o.client_po_number?.toLowerCase().includes(search) ||
        o.po_number?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.depotId !== 'all' ||
    filters.companyId !== 'all' ||
    filters.productId !== 'all' ||
    filters.poNumber ||
    filters.dateFrom ||
    filters.dateTo;

  const clearFilters = () => {
    setFilters({
      status: 'all',
      depotId: 'all',
      companyId: 'all',
      productId: 'all',
      poNumber: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  const canCreate = hasPermission('Purchase Orders (Create)');
  const canDelete = hasPermission('Purchase Orders (Delete)');
  const canUpdate = hasPermission('Purchase Orders (Update)');

  const handleDownloadExcel = () => {
    if (!statementData?.purchase_order?.id) return;
    const url = purchaseOrdersApi.exportStatement(statementData.purchase_order.id, 'excel');
    window.open(url, '_blank');
    toast.success('Downloading Excel file...');
  };

  const handleDownloadPDF = () => {
    if (!statementData?.purchase_order?.id) return;
    const url = purchaseOrdersApi.exportStatement(statementData.purchase_order.id, 'pdf');
    window.open(url, '_blank');
    toast.success('Downloading PDF file...');
  };



  const columns = [
    {
      key: 'po_number',
      label: 'PO Number',
      render: (v, row) => {
        const displayNumber = row.client_po_number || v || row.po_number || '-';
        return (
          <button
            className="mono font-medium text-blue-600 hover:underline"
            onClick={() => openStatement(row)}
          >
            {displayNumber}
          </button>
        );
      }
    },

    {
      key: 'client_po_date',
      label: 'PO Date',
      render: (_, row) => {
        const dateValue = row.client_po_date || row.po_date;
        return dateValue ? new Date(dateValue).toLocaleDateString('en-IN') : '-';
      }
    },

    { 
      key: 'source_type', 
      label: 'Source',
      render: (v) => v === 'Company' ? 'Company' : 'Depot'
    },
    { key: 'source_company_name', label: 'Source Company' },
    { key: 'to_company_name', label: 'Client' },
    { key: 'product_name', label: 'Product' },

    {
      key: 'estimated_completion_date',
      label: 'Est. Completion',
      render: (v) =>
        v
          ? new Date(v).toLocaleDateString('en-IN')
          : '-'
    },

    {
      key: 'po_copy_file_id',
      label: 'PO Copy',
      render: (v) =>
        v ? (
          <a
            href={getFileUrl(v)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View
          </a>
        ) : (
          <span className="text-sm text-gray-500">N/A</span>
        )
    },

    {
      key: 'total_quantity_mt',
      label: 'Total',
      render: (v) => `${v} MT`
    },

    // {
    //   key: 'dispatched_quantity_mt',
    //   label: 'Dispatch Progress',
    //   render: (_, row) => {
    //     const total = Number(row.total_quantity_mt) || 0;
    //     const dispatched = Number(row.dispatched_quantity_mt) || 0;
    //     const remaining = Number(row.remaining_quantity_mt) || 0;

    //     // Calculate exact percentage capped between 0 and 100
    //     const percentage = total > 0 ? Math.min(Math.round((dispatched / total) * 100), 100) : 0;

    //     // Color shifts to emerald green when completely dispatched
    //     const barColor = percentage === 100 ? 'bg-emerald-600' : 'bg-blue-600';

    //     return (
    //       <div className="w-full max-w-[160px] min-w-[120px] py-1">
    //         {/* Label breakdown */}
    //         <div className="flex justify-between items-end text-[11px] mb-1 text-gray-500 font-medium">
    //           <span>{dispatched} / {total} MT</span>
    //           <span className="font-semibold text-gray-700 text-xs">{percentage}%</span>
    //         </div>

    //         {/* Progress Bar Track */}
    //         <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
    //           <div
    //             className={`${barColor} h-full rounded-full transition-all duration-500 ease-out`}
    //             style={{ width: `${percentage}%` }}
    //           />
    //         </div>

    //         {/* Subtext showing remaining amount */}
    //         <div className="text-[10px] text-orange-600 mt-0.5 text-right font-medium">
    //           {remaining > 0 ? `${remaining} MT remaining` : 'Fully Dispatched'}
    //         </div>
    //       </div>
    //     );
    //   }
    // },

    {
      key: 'dispatched_quantity_mt',
      label: 'Dispatch Progress',
      render: (_, row) => {
        const total = Number(row.total_quantity_mt) || 0;
        const dispatched = Number(row.dispatched_quantity_mt) || 0;
        const remaining = Number(row.remaining_quantity_mt) || 0;

        // 1. Calculate raw percentage without capping it at 100%
        const percentage = total > 0 ? Math.round((dispatched / total) * 100) : 0;

        // 2. Determine status flags
        const isExceeded = dispatched > total;
        const isFullyDispatched = dispatched === total;

        // 3. Dynamic color shifting based on status
        let barColor = 'bg-blue-600'; // Default in progress
        if (isExceeded) {
          barColor = 'bg-red-600'; // Red alert for exceeded limits
        } else if (isFullyDispatched) {
          barColor = 'bg-emerald-600'; // Emerald green for perfect completion
        }

        // 4. Cap the physical visual width at 100% so the bar doesn't overflow the UI container
        const visualWidth = Math.min(percentage, 100);

        return (
          <div className="w-full max-w-[160px] min-w-[120px] py-1">
            {/* Label breakdown */}
            <div className="flex justify-between items-end text-[11px] mb-1 text-gray-500 font-medium">
              <span>{dispatched} / {total} MT</span>
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
                <span className="text-red-600 font-semibold">Dispatch Exceeded</span>
              ) : remaining > 0 ? (
                <span className="text-orange-600">{remaining} MT remaining</span>
              ) : (
                <span className="text-emerald-600">Fully Dispatched</span>
              )}
            </div>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (v, record) => {
        const statusValue = String(v || '').trim().toLowerCase();
        const isCompleted = statusValue === 'completed' || statusValue === 'fully dispatched';

        const rawPoDate = record?.po_date || record?.client_po_date;
        const rawEstDate = record?.estimated_completion_date;

        if (!rawPoDate || !rawEstDate) {
          return (
            <div className="flex flex-col gap-1 items-start">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                {v || 'Unknown'}
              </span>
              {isCompleted && record?.actual_completion_date && (
                <div className="text-[11px] text-green-600 mt-1 font-medium">
                  Completed on: {new Date(record.actual_completion_date).toLocaleDateString('en-IN')}
                </div>
              )}
            </div>
          );
        }

        const poDate = new Date(rawPoDate);
        const estCompDate = new Date(rawEstDate);
        const currentDate = new Date();

        poDate.setHours(0, 0, 0, 0);
        estCompDate.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);

        const msPerDay = 24 * 60 * 60 * 1000;

        // Calculate x & y with logical floors
        const x = Math.max(0, Math.floor((currentDate - poDate) / msPerDay));
        const y = Math.max(1, Math.floor((estCompDate - poDate) / msPerDay));

        // Calculate fulfillment metrics for warning highlights
        const dispatched = Number(record?.dispatched_quantity_mt || 0);
        const totalQty = Number(record?.total_quantity_mt || 0);
        const isExceeded = dispatched > totalQty;

        let trackingText = "";
        let trackingColorClass = "text-gray-500";

        if (isCompleted) {
          // Use explicit completion date, fallback to updated_at, fallback to current date
          const finishDate = record?.actual_completion_date || record?.updated_at
            ? new Date(record?.actual_completion_date || record?.updated_at)
            : new Date();
          finishDate.setHours(0, 0, 0, 0);

          // Guard: If the calculation date results in a timeline before the PO was opened, fallback to PO Date
          const trueFinishDate = finishDate < poDate ? poDate : finishDate;
          const varianceDays = Math.floor((trueFinishDate - estCompDate) / msPerDay);

          if (varianceDays < 0) {
            trackingText = `${Math.abs(varianceDays)} days before`;
            trackingColorClass = "text-green-600 font-medium";
          } else if (varianceDays === 0) {
            trackingText = "On time";
            trackingColorClass = "text-green-600 font-medium";
          } else {
            trackingText = `${varianceDays} days delay`;
            trackingColorClass = "text-red-600 font-semibold";
          }
        } else {
          // In Progress tracking calculations
          const remainingDays = Math.floor((estCompDate - currentDate) / msPerDay);

          if (isExceeded) {
            trackingText = "Quantity Exceeded";
            trackingColorClass = "text-red-600 font-bold";
          } else if (remainingDays > 0) {
            trackingText = `${remainingDays} days left`;
            trackingColorClass = "text-amber-600 font-medium";
          } else if (remainingDays === 0) {
            trackingText = "Due today";
            trackingColorClass = "text-amber-500 font-bold";
          } else {
            trackingText = `${Math.abs(remainingDays)} days delay`;
            trackingColorClass = "text-red-600 font-semibold";
          }
        }

        return (
          <div className="flex flex-col gap-1 items-start">
            {/* Main Status Pill Badge */}
            <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${isCompleted
              ? 'bg-green-100 text-green-700'
              : isExceeded
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
              }`}>
              {isExceeded && !isCompleted ? 'Over Dispatched' : v}
            </span>

            {/* Dynamic Timeline Text Sub-Row */}
            <div className="text-[11px] leading-tight mt-0.5 whitespace-nowrap">
              <span className="font-bold text-gray-700">{x}/{y}</span>
              <span className="text-gray-400 mx-1">•</span>
              <span className={trackingColorClass}>{trackingText}</span>
            </div>
            {record?.completion_reason && (
              <div className="text-[11px] text-amber-700 mt-1">
                <span className="font-semibold">Reason:</span> {record.completion_reason}
              </div>
            )}
            {isCompleted && record?.actual_completion_date && (
              <div className="text-[11px] text-green-600 mt-1 font-medium">
                Completed on: {new Date(record.actual_completion_date).toLocaleDateString('en-IN')}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'completion_reason',
      label: 'Close Reason',
      render: (v) => v ? (
        <span className="text-sm text-gray-700 break-words">{v}</span>
      ) : (
        <span className="text-sm text-gray-400">-</span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <Can action="update_purchase_order">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleEdit(row)}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </Can>

          {canUpdate &&
            row.status !== 'Completed' && (
              <Button
                size="sm"
                onClick={() => {
                  const totalQty = Number(row.total_quantity_mt || 0);
                  const dispatchedQty = Number(row.dispatched_quantity_mt || 0);
                  const requiresReason = dispatchedQty < totalQty;

                  setConfirmRow(row);
                  setConfirmReason('');
                  setConfirmRequiresReason(requiresReason);
                  setConfirmOpen(true);
                }}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Complete
              </Button>
            )}
        </div>
      )
    }
  ];

  return (
    <PageLayout
      title="Purchase Orders"
      subtitle="Depot to client dispatch orders"
      actions={
        <div className="flex gap-2">
          <Can action="create_purchase_order">
            <Button onClick={handleAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Create PO
            </Button>
          </Can>
        </div>
      }
    >

      <FilterPanel
        filters={filters}
        setFilters={setFilters}
        depots={depots}
        companies={companies}
        products={products}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6 mt-6">
        <Card>
          <CardContent className="pt-4">
            <p>Total POs</p>
            <p className="text-2xl font-bold">{filteredOrders.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p>Total Quantity</p>
            <p className="text-2xl font-bold">
              {filteredOrders.reduce((s, o) => s + (o.total_quantity_mt || 0), 0)} MT
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p>Dispatch Quantity</p>
            <p className="text-2xl font-bold text-green-600">
              {filteredOrders.reduce((s, o) => s + (o.dispatched_quantity_mt || 0), 0)} MT
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p>Remaining</p>
            <p className="text-2xl font-bold text-orange-600">
              {filteredOrders.reduce((s, o) => s + (isCompletedOrder(o) ? 0 : (Number(o.remaining_quantity_mt) || 0)), 0)} MT
            </p>
          </CardContent>
        </Card>
      </div>

      <PurchaseOrdersDataTable
        columns={columns}
        data={filteredOrders}
        loading={loading}
        onDelete={hasPermission('Purchase Orders (Delete)') ? handleDelete : undefined}
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          selectedItem
            ? 'Edit Purchase Order'
            : 'Create Purchase Order'
        }
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="space-y-4">

          <div>
            <Label>Source Type *</Label>
            <Select
              value={formData.source_type}
              onValueChange={(v) => setFormData({ ...formData, source_type: v, source_company_id: '', depot_id: '' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Depot">Depot</SelectItem>
                <SelectItem value="Company">Company</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.source_type === 'Company' ? (
            <div>
              <Label>Source Company *</Label>
              <Select
                value={formData.source_company_id}
                onValueChange={handleSourceCompanyChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source company" />
                </SelectTrigger>
                <SelectContent>
                  {companies.filter(c => c.company_type === 'Source' || c.company_type === 'Both').map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Depot *</Label>
              <Select
                value={formData.depot_id}
                onValueChange={handleDepotChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select depot" />
                </SelectTrigger>
                <SelectContent>
                  {depots.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Client Company *</Label>
            <Select
              value={formData.to_company_id}
              onValueChange={handleCompanyChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <div>
            <Label>Product *</Label>
            <Select
              value={formData.product_id}
              onValueChange={handleProductChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>


          <div>
            <Label>PO Number</Label>
            <Input
              value={formData.client_po_number}
              onChange={(e) => setFormData({ ...formData, client_po_number: e.target.value })}
              placeholder="Enter client PO number"
            />
          </div>

          <div>
            <Label>PO Date</Label>
            <Input
              type="date"
              value={formData.client_po_date}
              onChange={(e) => setFormData({ ...formData, client_po_date: e.target.value })}
            />
          </div>

          <div>
            <Label>Estimated Completion Date</Label>
            <Input
              type="date"
              value={formData.estimated_completion_date}
              onChange={(e) => setFormData({ ...formData, estimated_completion_date: e.target.value })}
            />
          </div>



  <div>
            <Label>Quantity (MT) *</Label>
            <Input
              type="number"
              value={formData.total_quantity_mt}
              onChange={(e) => setFormData({ ...formData, total_quantity_mt: e.target.value })}
            />
          </div>




          <div>
            <Label>Depot *</Label>
            <Select
              value={formData.depot_id}
              onValueChange={handleDepotChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select depot" />
              </SelectTrigger>
              <SelectContent>
                {depots.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

  
          <div>
            <Label>Remarks</Label>
            <Input
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
          </div>

          <div>
            <FileUpload
              value={formData.po_copy_file_id}
              onChange={(fileId) => setFormData({ ...formData, po_copy_file_id: fileId })}
              label="Upload PO Copy"
              accept="application/pdf,image/*"
              showCameraOption={false}
            />
          </div>


      

          {selectedItem && ['completed', 'fully dispatched'].includes(String(selectedItem.status || '').trim().toLowerCase()) && (
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </FormModal>

      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        loading={saving}
        title="Delete Purchase Order"
        description="Are you sure?"
      />

      <ConfirmationDialogue
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) {
            setConfirmReason('');
            setConfirmRequiresReason(false);
          }
        }}
        title="Complete Purchase Order"
        description={
          confirmRow
            ? `Are you sure you want to complete this PO? Balance is ${Number(confirmRow.remaining_quantity_mt || 0).toFixed(2)} MT.`
            : 'Are you sure you want to complete this purchase order?'
        }
        confirmLabel="Complete"
        cancelLabel="Cancel"
        loading={confirmLoading}
        onConfirm={handleConfirmComplete}
      >
        {confirmRequiresReason && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Dispatch quantity is less than PO quantity. Please provide a reason for closing early.
            </p>
            <textarea
              value={confirmReason}
              onChange={(e) => setConfirmReason(e.target.value)}
              className="w-full border rounded-md p-2 text-sm"
              rows={3}
              placeholder="Enter reason for early closure"
            />
          </div>
        )}
      </ConfirmationDialogue>

      <ConfirmationDialogue
        open={reopenOpen}
        onOpenChange={(open) => {
          setReopenOpen(open);
        }}
        title="Reopen Completed Purchase Order"
        confirmLabel="Yes, Reopen"
        cancelLabel="Cancel"
        loading={reopenLoading}
        onConfirm={handleReopenConfirm}
      >
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            Are you sure you want to change this PO status from <span className="font-semibold text-green-600">Completed</span> to <span className="font-semibold text-blue-600">In Progress</span>?
          </p>
          {selectedItem && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              {selectedItem.actual_completion_date && (
                <div>
                  <span className="text-gray-600">Completed on:</span>
                  <span className="font-semibold text-green-700 ml-2">
                    {new Date(selectedItem.actual_completion_date).toLocaleDateString('en-IN')}
                  </span>
                </div>
              )}
              {selectedItem.dispatched_quantity_mt !== undefined && selectedItem.total_quantity_mt && (
                <div>
                  <span className="text-gray-600">Dispatch Progress:</span>
                  <span className="font-semibold text-blue-700 ml-2">
                    {Number(selectedItem.dispatched_quantity_mt).toFixed(2)} / {Number(selectedItem.total_quantity_mt).toFixed(2)} MT ({Math.round((Number(selectedItem.dispatched_quantity_mt) / Number(selectedItem.total_quantity_mt)) * 100)}%)
                  </span>
                </div>
              )}
            </div>
          )}
          <p className="text-amber-700 font-medium">
            This action will revert the completion status. Proceed with caution.
          </p>
        </div>
      </ConfirmationDialogue>

      <POStatementModal
        statementData={statementData}
        statementOpen={statementOpen}
        handleDownloadExcel={handleDownloadExcel}
        handleDownloadPDF={handleDownloadPDF}
        setStatementOpen={setStatementOpen}
        onClose={() => setStatementOpen(false)} />

    </PageLayout>
  );
}