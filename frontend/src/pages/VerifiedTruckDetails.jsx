import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  FileCheck,
  Plus,
  SlidersHorizontal
} from 'lucide-react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { verifiedTrucksApi, getFileUrl, uploadFile } from '../lib/api';
import { toast } from 'sonner';
import { VerifiedTruckDetailsDataTable } from '@/components/verifiedTruckDetails/DataTable';
import VerifiedTruckDetailsFilterPanel from '@/components/verifiedTruckDetails/FilterPanel';
import { usePermissions } from '../lib/permissions';

export default function VerifiedTruckDetails() {
  const { hasPermission, hasActionPermission } = usePermissions();
  const canView = hasPermission('Verified Trucks Details (View)');
  const canCreate = hasActionPermission('create_verified_truck');
  const canUpdate = hasActionPermission('update_verified_truck');
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [expandedRows, setExpandedRows] = useState({});
  const [showInvoiceForm, setShowInvoiceForm] = useState({});
  const [showShippingForm, setShowShippingForm] = useState({});
  const [showPackingListForm, setShowPackingListForm] = useState({});

  const defaultDates = (() => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 2);
    const fmt = (d) => d.toISOString().slice(0,10);
    return { dateFrom: fmt(from), dateTo: fmt(to) };
  })();

  const [filters, setFilters] = useState({
    dateFrom: defaultDates.dateFrom,
    dateTo: defaultDates.dateTo,
    truckNo: '',
    transporter: '',
    driverMobile: '',
    company: '',
    product: '',
    poNumber: '',
    poDate: '',
    depot: '',
    verifiedBy: '',
    invoiceNo: '',
    invoiceDate: '',
    invoiceAmount: '',
    shippingNo: '',
    shippingDate: '',
    shippingAmount: '',
    invoiceHasUploads: '',
    shippingHasUploads: '',
    packingListNo: '',
    packingListDate: '',
    packingListHasUploads: ''
  });

  const [forms, setForms] = useState({});

  // Fetch verified trucks
  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize
      };

      if (filters.truckNo) params.truck_no = filters.truckNo;
      if (filters.transporter) params.transporter = filters.transporter;
      if (filters.driverMobile) params.driver_mobile = filters.driverMobile;
      if (filters.company) params.company = filters.company;
      if (filters.poNumber) params.po_number = filters.poNumber;
      if (filters.dateFrom) params.start_date = filters.dateFrom;
      if (filters.dateTo) params.end_date = filters.dateTo;
      if (filters.verifiedBy) params.verified_by = filters.verifiedBy;
      if (filters.invoiceNo) params.invoice_no = filters.invoiceNo;
      if (filters.shippingNo) params.shipping_no = filters.shippingNo;
      if (filters.packingListNo) params.packing_list_no = filters.packingListNo;

      const res = await verifiedTrucksApi.getAll(params);
      console.log('Fetched trucks:', res.data);
      let data = Array.isArray(res.data) ? res.data : [];

      // Client-side filtering for invoice/shipping uploads
      data = data.filter(truck => {
        if (filters.invoiceHasUploads === 'yes' && !truck.invoice_details?.file_id) return false;
        if (filters.invoiceHasUploads === 'no' && truck.invoice_details?.file_id) return false;
        if (filters.shippingHasUploads === 'yes' && !truck.shipping_details?.file_id) return false;
        if (filters.shippingHasUploads === 'no' && truck.shipping_details?.file_id) return false;
        if (filters.packingListHasUploads === 'yes' && !truck.packing_list_details?.file_id) return false;
        if (filters.packingListHasUploads === 'no' && truck.packing_list_details?.file_id) return false;
        return true;
      });

      // Client-side filtering for PO/Invoice/Shipping dates and amounts
      data = data.filter(truck => {
        // PO Date (compare YYYY-MM-DD)
        if (filters.poDate) {
          const t = truck.po_date ? (new Date(truck.po_date).toISOString().slice(0,10)) : '';
          if (t !== filters.poDate) return false;
        }

        // Invoice Date
        if (filters.invoiceDate) {
          const t = truck.invoice_details?.invoice_date ? (new Date(truck.invoice_details.invoice_date).toISOString().slice(0,10)) : '';
          if (t !== filters.invoiceDate) return false;
        }

        // Shipping Date
        if (filters.shippingDate) {
          const t = truck.shipping_details?.shipping_date ? (new Date(truck.shipping_details.shipping_date).toISOString().slice(0,10)) : '';
          if (t !== filters.shippingDate) return false;
        }

        // Packing List Date
        if (filters.packingListDate) {
          const t = truck.packing_list_details?.packing_list_date ? (new Date(truck.packing_list_details.packing_list_date).toISOString().slice(0,10)) : '';
          if (t !== filters.packingListDate) return false;
        }

        // Invoice Amount (exact match)
        if (filters.invoiceAmount) {
          const amt = truck.invoice_details?.invoice_amount != null ? Number(truck.invoice_details.invoice_amount) : null;
          if (amt === null || amt !== Number(filters.invoiceAmount)) return false;
        }

        // Shipping Amount (exact match)
        if (filters.shippingAmount) {
          const amt = truck.shipping_details?.shipping_bill_amount != null ? Number(truck.shipping_details.shipping_bill_amount) : null;
          if (amt === null || amt !== Number(filters.shippingAmount)) return false;
        }

        return true;
      });

      setTrucks(data);
      setTotalPages(Math.ceil(data.length / pageSize) || 1);
    } catch (err) {
      toast.error('Failed to load verified trucks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, [page, filters]);

  // When an invoice or shipping form is opened, prefill the corresponding form
  // with existing truck data if available so users see previous values when editing.
  useEffect(() => {
    // Prefill invoice forms
    Object.entries(showInvoiceForm).forEach(([id, open]) => {
      const key = `invoice_${id}`;
      if (open && (!forms[key] || Object.keys(forms[key]).length === 0)) {
        const truck = trucks.find(t => String(t.id) === String(id));
        if (truck && truck.invoice_details) {
          const d = truck.invoice_details;
          setForms(prev => ({
            ...prev,
            [key]: {
              invoiceNo: d.invoice_no || '',
              invoiceDate: d.invoice_date || '',
              comments: d.comments || '',
              file: null,
              fileName: d.file_id || d.fileId || '',
              invoiceAmount: d.invoice_amount || d.invoiceAmount || '',
              currency: d.currency || 'INR'
            }
          }));
        } else {
          setForms(prev => ({ ...prev, [key]: {} }));
        }
      }
    });

    // Prefill shipping forms
    Object.entries(showShippingForm).forEach(([id, open]) => {
      const key = `shipping_${id}`;
      if (open && (!forms[key] || Object.keys(forms[key]).length === 0)) {
        const truck = trucks.find(t => String(t.id) === String(id));
        if (truck && truck.shipping_details) {
          const d = truck.shipping_details;
          setForms(prev => ({
            ...prev,
            [key]: {
              shippingNo: d.shipping_no || '',
              shippingDate: d.shipping_date || '',
              comments: d.comments || '',
              file: null,
              fileName: d.file_id || d.fileId || '',
              shippingBillAmount: d.shipping_bill_amount || d.shippingBillAmount || '',
              currency: d.currency || 'INR'
            }
          }));
        } else {
          setForms(prev => ({ ...prev, [key]: {} }));
        }
      }
    });

    // Prefill packing list forms
    Object.entries(showPackingListForm).forEach(([id, open]) => {
      const key = `packingList_${id}`;
      if (open && (!forms[key] || Object.keys(forms[key]).length === 0)) {
        const truck = trucks.find(t => String(t.id) === String(id));
        if (truck && truck.packing_list_details) {
          const d = truck.packing_list_details;
          setForms(prev => ({
            ...prev,
            [key]: {
              packingListNo: d.packing_list_no || '',
              packingListDate: d.packing_list_date || '',
              remarks: d.remarks || '',
              file: null,
              fileName: d.file_id || d.fileId || ''
            }
          }));
        } else {
          setForms(prev => ({ ...prev, [key]: {} }));
        }
      }
    });
  }, [showInvoiceForm, showShippingForm, showPackingListForm, trucks, forms]);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleInvoiceSubmit = async (truckId) => {
    const form = forms[`invoice_${truckId}`];
    if (!form?.invoiceNo || !form?.invoiceDate) {
      toast.error('Invoice No. and Invoice Date are required');
      return;
    }

    try {
      let fileId = null;
      if (form.file) {
        const uploadRes = await uploadFile(form.file);
        fileId = uploadRes.file_id || uploadRes.fileId || uploadRes;
      }

      const invoiceData = {
        invoice_added: true,
        invoice_details: {
          invoice_no: form.invoiceNo,
          invoice_date: form.invoiceDate,
          comments: form.comments || '',
          file_id: fileId,
          invoice_amount: form.invoiceAmount ? parseFloat(form.invoiceAmount) : null,
          currency: form.currency || 'INR'
        }
      };

      await verifiedTrucksApi.update(truckId, invoiceData);

      toast.success('Invoice saved');
      setShowInvoiceForm(prev => ({ ...prev, [truckId]: false }));
      setForms(prev => ({ ...prev, [`invoice_${truckId}`]: {} }));
      fetchTrucks();
    } catch (err) {
      toast.error('Failed to save invoice');
    }
  };

  const handleShippingSubmit = async (truckId) => {
    const form = forms[`shipping_${truckId}`];
    if (!form?.shippingNo || !form?.shippingDate) {
      toast.error('Shipping No. and Shipping Date are required');
      return;
    }

    try {
      let fileId = null;
      if (form.file) {
        const uploadRes = await uploadFile(form.file);
        fileId = uploadRes.file_id || uploadRes.fileId || uploadRes;
      }

      const shippingData = {
        shipping_added: true,
        shipping_details: {
          shipping_no: form.shippingNo,
          shipping_date: form.shippingDate,
          comments: form.comments || '',
          file_id: fileId,
          shipping_bill_amount: form.shippingBillAmount ? parseFloat(form.shippingBillAmount) : null,
          currency: form.currency || 'INR'
        }
      };

      await verifiedTrucksApi.update(truckId, shippingData);

      toast.success('Shipping details saved');
      setShowShippingForm(prev => ({ ...prev, [truckId]: false }));
      setForms(prev => ({ ...prev, [`shipping_${truckId}`]: {} }));
      fetchTrucks();
    } catch (err) {
      toast.error('Failed to save shipping details');
    }
  };

  const handlePackingListSubmit = async (truckId) => {
    const form = forms[`packingList_${truckId}`];
    if (!form?.packingListNo || !form?.packingListDate) {
      toast.error('Packing List No. and Packing List Date are required');
      return;
    }

    try {
      let fileId = null;
      if (form.file) {
        const uploadRes = await uploadFile(form.file);
        fileId = uploadRes.file_id || uploadRes.fileId || uploadRes;
      }

      const packingListData = {
        packing_list_added: true,
        packing_list_details: {
          packing_list_no: form.packingListNo,
          packing_list_date: form.packingListDate,
          remarks: form.remarks || '',
          file_id: fileId
        }
      };

      await verifiedTrucksApi.update(truckId, packingListData);

      toast.success('Packing List saved');
      setShowPackingListForm(prev => ({ ...prev, [truckId]: false }));
      setForms(prev => ({ ...prev, [`packingList_${truckId}`]: {} }));
      fetchTrucks();
    } catch (err) {
      toast.error('Failed to save packing list');
    }
  };

  const updateForm = (key, field, value) => {
    setForms(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const paginatedTrucks = trucks.slice((page - 1) * pageSize, page * pageSize);

  if (!canView) {
    return (
      <PageLayout title="Verified Dispatch Details">
        <div className="p-8 text-center text-gray-500">You do not have permission to view verified truck details.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Verified Dispatch Details" subtitle="Verified weightment slips with invoice & shipping records">
    



      <VerifiedTruckDetailsFilterPanel 
        filters={filters}
        setFilters={setFilters}
        setPage={setPage}
      />
      <VerifiedTruckDetailsDataTable
        data={paginatedTrucks}
        canCreate={canCreate}
        canUpdate={canUpdate}
        expandedRows={expandedRows}
        page={page}
        pageSize={pageSize}
        totalRecords={trucks.length}
        trucks={trucks}
        toggleRow={toggleRow}
        paginatedTrucks={paginatedTrucks}
        getFileUrl={getFileUrl}
        showInvoiceForm={showInvoiceForm}
        showShippingForm={showShippingForm}
        showPackingListForm={showPackingListForm}
        setShowInvoiceForm={setShowInvoiceForm}
        setShowShippingForm={setShowShippingForm}
        setShowPackingListForm={setShowPackingListForm}
        forms={forms}
        updateForm={updateForm}
        handleInvoiceSubmit={handleInvoiceSubmit}
        handleShippingSubmit={handleShippingSubmit}
        handlePackingListSubmit={handlePackingListSubmit}
 
        emptyMessage="No verified trucks found"
      />
    </PageLayout>
  );
}
