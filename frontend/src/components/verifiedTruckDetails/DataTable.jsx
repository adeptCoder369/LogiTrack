
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  FileCheck,
  Plus,
  Truck,
  Building2,
  Package,
  Hash,
  Calendar,
  Scale,
  UserCheck,
  Phone,
  MapPin,
  FileSpreadsheet,
  Edit2
} from 'lucide-react';
import { LogisticsDataForm } from './LogisticsDataForm'; // Path to the subcomponent file

const currencySymbols = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  AED: 'د.إ',
  GBP: '£'
};

const formatCurrencyLabel = (currency = 'INR') => {
  const code = currency || 'INR';
  const symbol = currencySymbols[code] || '';
  return `${symbol ? `${symbol} ` : ''}${code}`;
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const formatCurrencyAmount = (currency = 'INR', amount) => {
  if (amount == null) return '-';
  const symbol = currencySymbols[currency] || '';
  return `${symbol ? `${symbol} ` : ''}${Number(amount).toFixed(2)}`;
};

export const VerifiedTruckDetailsDataTable = ({
  paginatedTrucks = [],
  canCreate,
  canUpdate,
  page,
  setPage,
  trucks = [],
  showInvoiceForm = {},
  showShippingForm = {},
  showPackingListForm = {},
  setShowInvoiceForm,
  setShowShippingForm,
  setShowPackingListForm,
  handleInvoiceSubmit,
  handleShippingSubmit,
  handlePackingListSubmit,
  forms = {},
  updateForm,
  getFileUrl,
  pageSize,
  totalPages,
  toggleRow,
  expandedRows = {},
  loading = false,
  emptyMessage = 'No verified trucks available',
  emptyIcon: EmptyIcon
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-slate-200 rounded w-1/4 mx-auto"></div>
          <div className="text-slate-400 text-xs">Loading records...</div>
        </div>
      </div>
    );
  }

  if (!trucks || trucks.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
        {EmptyIcon ? <EmptyIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" /> : <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />}
        <p className="text-slate-500 text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* Scrollable Container with Max Height for Sticky Columns */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden max-h-[650px] overflow-y-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            {/* Sticky Row Header */}
            <tr className="bg-slate-50/75 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)] text-slate-700">
              <th className="px-4 py-3.5 font-semibold text-slate-500 w-12">#</th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap"><span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-slate-400" /> Truck No.</span></th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap"><span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /> Transporter</span></th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap"><span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-slate-400" /> Company</span></th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap"><span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-slate-400" /> Product</span></th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap"><span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" /> PO Number</span></th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap"><span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> PO Date</span></th>
              <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-right pr-6"><span className="flex items-center gap-1.5 justify-end"><Scale className="w-3.5 h-3.5 text-slate-400" /> Weight (MT)</span></th>
              <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Invoice</th>
              <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Shipping</th>
              <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Packing List</th>
              <th className="px-4 py-3.5 font-semibold text-center w-16">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
            {paginatedTrucks.length === 0 ? (
              <tr>
                <td colSpan="12" className="px-4 py-12 text-center text-slate-400 bg-slate-50/50 font-normal">
                  No verified trucks found matching criteria.
                </td>
              </tr>
            ) : (
              paginatedTrucks.map((truck, idx) => {
                // Check if invoice is COMPLETE (both number and date required)
                const hasInvoice = !!(truck.invoice_details?.invoice_no && truck.invoice_details?.invoice_date);
                const invoiceMissing = [];
                if (!truck.invoice_details?.invoice_no) invoiceMissing.push('No.');
                if (!truck.invoice_details?.invoice_date) invoiceMissing.push('Date');

                // Check if shipping is COMPLETE (both number and date required)
                const hasShipping = !!(truck.shipping_details?.shipping_no && truck.shipping_details?.shipping_date);
                const shippingMissing = [];
                if (!truck.shipping_details?.shipping_no) shippingMissing.push('No.');
                if (!truck.shipping_details?.shipping_date) shippingMissing.push('Date');

// Check if packing list is COMPLETE (both number and date required)
                const hasPackingList = !!(truck.packing_list_details?.packing_list_no && truck.packing_list_details?.packing_list_date);
                const packingListMissing = [];
                if (!truck.packing_list_details?.packing_list_no) packingListMissing.push('No.');
                if (!truck.packing_list_details?.packing_list_date) packingListMissing.push('Date');

                return (
                  <React.Fragment key={truck.id}>
                    {/* Main Row */}
                    <tr className={`hover:bg-slate-50/80 transition-colors ${expandedRows[truck.id] ? 'bg-slate-50/40' : ''}`}>
                      <td className="px-4 py-3.5 font-normal text-slate-400">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900 tracking-wider">{truck.truck_no || '-'}</td>
                      <td className="px-4 py-3.5 truncate max-w-[150px]" title={truck.transporter}>{truck.transporter || '-'}</td>
                      <td
                        className="px-4 py-3.5 truncate  cursor-help"
                        title={truck.company || ''}
                      >
                        {truck.company || '-'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[10px]">
                          {truck.product || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold">
                        {truck.po_number ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/purchase-orders?poNumber=${encodeURIComponent(truck.po_number)}`)}
                            className="text-blue-600 hover:underline"
                          >
                            {truck.po_number}
                          </button>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-500">{formatDateShort(truck.po_date)}</td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600 text-right pr-6 text-sm">{truck.weight || '-'}</td>

                      {/* Live Quick Status Indicators */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {hasInvoice ? (
                          <span className="inline-flex flex-col items-start rounded-md px-3 py-2 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200" title="Invoice complete">
                            <span className="font-semibold">✓ {truck.invoice_details.invoice_no}</span>
                            <span className="text-[10px] text-slate-600">{formatDateShort(truck.invoice_details.invoice_date)}</span>
                            {truck.invoice_details.invoice_amount != null && (
                              <span className="text-[11px] text-slate-800 font-semibold">{formatCurrencyAmount(truck.invoice_details.currency, truck.invoice_details.invoice_amount)}</span>
                            )}
                          </span>
                        ) : canCreate ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!expandedRows[truck.id]) toggleRow(truck.id);
                              setShowInvoiceForm(prev => ({ ...prev, [truck.id]: true }));
                            }}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100"
                            title={`Click to add missing invoice info: ${invoiceMissing.join(', ')}`}
                          >
                            ⚠ {invoiceMissing.join(', ')}
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200">
                            ✕ Missing
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {hasShipping ? (
                          <span className="inline-flex flex-col items-start rounded-md px-3 py-2 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200" title="Shipping complete">
                            <span className="font-semibold">✓ {truck.shipping_details.shipping_no}</span>
                            <span className="text-[10px] text-slate-600">{formatDateShort(truck.shipping_details.shipping_date)}</span>
                            {truck.shipping_details.shipping_bill_amount != null && (
                              <span className="text-[11px] text-slate-800 font-semibold">{formatCurrencyAmount(truck.shipping_details.currency, truck.shipping_details.shipping_bill_amount)}</span>
                            )}
                          </span>
                        ) : canCreate ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!expandedRows[truck.id]) toggleRow(truck.id);
                              setShowShippingForm(prev => ({ ...prev, [truck.id]: true }));
                            }}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100"
                            title={`Click to add missing shipping info: ${shippingMissing.join(', ')}`}
                          >
                            ⚠ {shippingMissing.join(', ')}
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200">
                            ✕ Missing
                          </span>
                        )}
                      </td>

<td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {hasPackingList ? (
                          <span className="inline-flex flex-col items-start rounded-md px-3 py-2 text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200" title="Packing List complete">
                            <span className="font-semibold">✓ {truck.packing_list_details.packing_list_no}</span>
                            <span className="text-[10px] text-slate-600">{formatDateShort(truck.packing_list_details.packing_list_date)}</span>
                          </span>
                        ) : canCreate ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!expandedRows[truck.id]) toggleRow(truck.id);
                              setShowPackingListForm(prev => ({ ...prev, [truck.id]: true }));
                            }}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100"
                            title={`Click to add missing packing list info: ${packingListMissing.join(', ')}`}
                          >
                            ⚠ {packingListMissing.join(', ')}
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200">
                            ✕ Missing
                          </span>
                        )}
                      </td>

                      {/* Open Nested Info Drawer */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => toggleRow(truck.id)}
                          className={`inline-flex items-center justify-center p-1.5 rounded-md transition-colors ${expandedRows[truck.id] ? 'bg-slate-200/80 text-slate-800' : 'text-blue-600 hover:bg-blue-50'}`}
                        >
                          {expandedRows[truck.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>

                    {/* Collapsible Inner Details Block */}
                    {expandedRows[truck.id] && (
                      <tr className="bg-slate-50/70 border-inner shadow-inner">
                        <td colSpan="12" className="px-6 py-5 border-l-2 border-blue-500 bg-slate-50/30">
                          <div className="space-y-6">

                            {/* Nested Details Sub-section Grid */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6">
                                <div className="space-y-0.5">
                                  <span className="text-slate-400 font-normal flex items-center gap-1"><Phone className="w-3 h-3" /> Driver Mobile</span>
                                  <p className="text-slate-800 text-xs font-semibold">{truck.driver_mobile || '-'}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-slate-400 font-normal flex items-center gap-1"><MapPin className="w-3 h-3" /> Depot Destination</span>
                                  <p className="text-slate-800 text-xs font-semibold">{truck.depot || '-'}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-slate-400 font-normal flex items-center gap-1"><UserCheck className="w-3 h-3" /> Verified By</span>
                                  <p className="text-slate-800 text-xs font-semibold">{truck.verified_by || '-'}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="text-slate-400 font-normal flex items-center gap-1"><FileSpreadsheet className="w-3 h-3" /> Attached Verification Slips</span>
                                  <div className="flex gap-3 pt-0.5">
                                    {truck.tare_slip_file_id ? (
                                      <button
                                        onClick={() => window.open(getFileUrl(truck.tare_slip_file_id), '_blank')}
                                        className="text-blue-600 hover:underline text-xs flex items-center gap-0.5 font-bold"
                                      >
                                        📄 Tare Slip
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 text-xs font-normal">No Tare Slip</span>
                                    )}
                                    {truck.weightment_slip_file_id ? (
                                      <button
                                        onClick={() => window.open(getFileUrl(truck.weightment_slip_file_id), '_blank')}
                                        className="text-blue-600 hover:underline text-xs flex items-center gap-0.5 font-bold"
                                      >
                                        📊 Weightment
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 text-xs font-normal">No Weightment Slip</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Forms Wrapper (Side-By-Side Design) */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">

                              {/* Invoice Content */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                    <h4 className="font-bold text-slate-800">View Invoice</h4>
                                  </div>
                                  {!showInvoiceForm[truck.id] && (
                                    (hasInvoice ? canUpdate : canCreate) && (
                                      <button
                                        onClick={() => setShowInvoiceForm(prev => ({ ...prev, [truck.id]: true }))}
                                        className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-md text-xs font-semibold shadow-xs"
                                      >
                                        {hasInvoice ? <><Edit2 className="w-3 h-3" /> Edit Entry</> : <><Plus className="w-3 h-3" /> Add Entry</>}
                                      </button>
                                    )
                                  )}
                                </div>

                                {showInvoiceForm[truck.id] ? (
                                  <LogisticsDataForm
                                    type="invoice"
                                    truckId={truck.id}
                                    formData={forms[`invoice_${truck.id}`]}
                                    updateForm={updateForm}
                                    onSubmit={handleInvoiceSubmit}
                                    onCancel={() => setShowInvoiceForm(prev => ({ ...prev, [truck.id]: false }))}
                                  />
                                ) : (
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 text-xs text-slate-600 min-h-[100px] flex flex-col justify-center shadow-xs">
                                    {hasInvoice ? (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-emerald-100">
                                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                          <span className="text-emerald-700 font-semibold text-xs">Complete</span>
                                        </div>
                                        <p><span className="text-slate-400 font-normal">Invoice No:</span> <strong className="text-slate-800 font-mono font-bold">{truck.invoice_details.invoice_no}</strong></p>
                                        <p><span className="text-slate-400 font-normal">Date:</span> <span className="text-slate-700 font-semibold">{truck.invoice_details.invoice_date}</span></p>
                                        {truck.invoice_details.comments && <p><span className="text-slate-400 font-normal">Comments:</span> <span className="italic text-slate-600">{truck.invoice_details.comments}</span></p>}
                                        {truck.invoice_details.invoice_amount != null && <p><span className="text-slate-400 font-normal">Amount:</span> <span className="text-slate-800 font-semibold">{formatCurrencyLabel(truck.invoice_details.currency)} {Number(truck.invoice_details.invoice_amount).toFixed(2)}</span></p>}
                                        {truck.invoice_details.file_id && (
                                          <a href={getFileUrl(truck.invoice_details.file_id)} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 mt-1">
                                            📄 View Registered Document
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col justify-center items-center py-2">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-100 w-full">
                                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                          <span className="text-amber-700 font-semibold text-xs">Missing: {invoiceMissing.join(', ')}</span>
                                        </div>
                                        <p className="text-slate-400 italic text-center text-xs mt-2">Please add missing fields</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Shipping Content */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileCheck className="w-4 h-4 text-slate-700" />
                                    <h4 className="font-bold text-slate-800">Shipping Bill</h4>
                                  </div>
                                  {!showShippingForm[truck.id] && (
                                    (hasShipping ? canUpdate : canCreate) && (
                                      <button
                                        onClick={() => setShowShippingForm(prev => ({ ...prev, [truck.id]: true }))}
                                        className="flex items-center gap-1 text-slate-700 hover:bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-md text-xs font-semibold shadow-xs"
                                      >
                                        {hasShipping ? <><Edit2 className="w-3 h-3" /> Edit Entry</> : <><Plus className="w-3 h-3" /> Add Entry</>}
                                      </button>
                                    )
                                  )}
                                </div>

                                {showShippingForm[truck.id] ? (
                                  <LogisticsDataForm
                                    type="shipping"
                                    truckId={truck.id}
                                    formData={forms[`shipping_${truck.id}`]}
                                    updateForm={updateForm}
                                    onSubmit={handleShippingSubmit}
                                    onCancel={() => setShowShippingForm(prev => ({ ...prev, [truck.id]: false }))}
                                  />
                                ) : (
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 text-xs text-slate-600 min-h-[100px] flex flex-col justify-center shadow-xs">
                                    {hasShipping ? (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-emerald-100">
                                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                          <span className="text-emerald-700 font-semibold text-xs">Complete</span>
                                        </div>
                                        <p><span className="text-slate-400 font-normal">Shipping No:</span> <strong className="text-slate-800 font-mono font-bold">{truck.shipping_details.shipping_no}</strong></p>
                                        <p><span className="text-slate-400 font-normal">Date:</span> <span className="text-slate-700 font-semibold">{truck.shipping_details.shipping_date}</span></p>
                                        {truck.shipping_details.comments && <p><span className="text-slate-400 font-normal">Comments:</span> <span className="italic text-slate-600">{truck.shipping_details.comments}</span></p>}
                                        {truck.shipping_details.shipping_bill_amount != null && <p><span className="text-slate-400 font-normal">Amount:</span> <span className="text-slate-800 font-semibold">{formatCurrencyLabel(truck.shipping_details.currency)} {Number(truck.shipping_details.shipping_bill_amount).toFixed(2)}</span></p>}
                                        {truck.shipping_details.file_id && (
                                          <a href={getFileUrl(truck.shipping_details.file_id)} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 mt-1">
                                            📄 View Registered Document
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col justify-center items-center py-2">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-100 w-full">
                                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                          <span className="text-amber-700 font-semibold text-xs">Missing: {shippingMissing.join(', ')}</span>
                                        </div>
                                        <p className="text-slate-400 italic text-center text-xs mt-2">Please add missing fields</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Packing List Content */}
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-purple-600" />
                                    <h4 className="font-bold text-slate-800">Packing List</h4>
                                  </div>
                                  {!showPackingListForm[truck.id] && (
                                    (hasPackingList ? canUpdate : canCreate) && (
                                      <button
                                        onClick={() => setShowPackingListForm(prev => ({ ...prev, [truck.id]: true }))}
                                        className="flex items-center gap-1 text-purple-700 hover:bg-purple-50 border border-purple-200/60 px-2.5 py-1 rounded-md text-xs font-semibold shadow-xs"
                                      >
                                        {hasPackingList ? <><Edit2 className="w-3 h-3" /> Edit Entry</> : <><Plus className="w-3 h-3" /> Add Entry</>}
                                      </button>
                                    )
                                  )}
                                </div>

                                {showPackingListForm[truck.id] ? (
                                  <LogisticsDataForm
                                    type="packingList"
                                    truckId={truck.id}
                                    formData={forms[`packingList_${truck.id}`]}
                                    updateForm={updateForm}
                                    onSubmit={handlePackingListSubmit}
                                    onCancel={() => setShowPackingListForm(prev => ({ ...prev, [truck.id]: false }))}
                                  />
                                ) : (
                                  <div className="bg-white p-3.5 rounded-xl border border-slate-200/60 text-xs text-slate-600 min-h-[100px] flex flex-col justify-center shadow-xs">
                                    {hasPackingList ? (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-emerald-100">
                                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                          <span className="text-emerald-700 font-semibold text-xs">Complete</span>
                                        </div>
                                        <p><span className="text-slate-400 font-normal">Packing List No:</span> <strong className="text-slate-800 font-mono font-bold">{truck.packing_list_details.packing_list_no}</strong></p>
                                        <p><span className="text-slate-400 font-normal">Date:</span> <span className="text-slate-700 font-semibold">{truck.packing_list_details.packing_list_date}</span></p>
                                        {truck.packing_list_details.remarks && <p><span className="text-slate-400 font-normal">Remarks:</span> <span className="italic text-slate-600">{truck.packing_list_details.remarks}</span></p>}
                                        {truck.packing_list_details.file_id && (
                                          <a href={getFileUrl(truck.packing_list_details.file_id)} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline inline-flex items-center gap-1 mt-1">
                                            📄 View Registered Document
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex flex-col justify-center items-center py-2">
                                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-amber-100 w-full">
                                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                          <span className="text-amber-700 font-semibold text-xs">Missing: {packingListMissing.join(', ')}</span>
                                        </div>
                                        <p className="text-slate-400 italic text-center text-xs mt-2">Please add missing fields</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between mt-5 bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
        <div className="text-xs font-medium text-slate-500">
          Showing {paginatedTrucks.length > 0 ? (page - 1) * pageSize + 1 : 0} to {Math.min(page * pageSize, trucks.length)} of {trucks.length} total entries
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <div className="flex items-center px-3 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-md">
            Page {page} of {totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || totalPages === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
};