import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import {
  ChevronDown,
  ChevronUp,
  Truck,
  Building2,
  Package,
  Hash,
  Calendar,
  Scale,
} from 'lucide-react';
import { TruckDetailsModal } from './TruckDetailsModal';

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

export const formatFinalDateTime = (dateString: string) => {
  if (!dateString) return "-";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateString));
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
  const [selectedTruck, setSelectedTruck] = React.useState(null);

  React.useEffect(() => {
    if (!selectedTruck) return;
    const updated = trucks.find(t => String(t.id) === String(selectedTruck.id));
    if (updated) setSelectedTruck(updated);
  }, [trucks]);

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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden max-h-[650px] overflow-y-auto">
        <div className="overflow-x-auto min-w-0">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)] text-slate-700">
                <th className="px-2 py-2 sm:px-3 sm:py-3 font-semibold text-slate-500 w-8 sm:w-12">#</th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-slate-500 whitespace-nowrap min-w-[80px]">
                  <span className="flex items-center gap-1 sm:gap-1.5">
                    <Truck className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400" /> Truck No.
                  </span>
                </th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-slate-500 whitespace-nowrap min-w-[100px]">
                  <span className="flex items-center gap-1 sm:gap-1.5">
                    <Building2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400" /> Transporter
                  </span>
                </th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-slate-500 whitespace-nowrap min-w-[80px]">
                  <span className="flex items-center gap-1 sm:gap-1.5">
                    <Building2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400" /> Source
                  </span>
                </th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-slate-500 whitespace-nowrap min-w-[100px]">
                  <span className="flex items-center gap-1 sm:gap-1.5">
                    <Building2 className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400" /> Company
                  </span>
                </th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-slate-500 whitespace-nowrap min-w-[80px]">
                  <span className="flex items-center gap-1 sm:gap-1.5">
                    <Package className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400" /> Product
                  </span>
                </th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-slate-500 whitespace-nowrap min-w-[100px]">
                  <span className="flex items-center gap-1 sm:gap-1.5">
                    <Hash className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400" /> PO
                  </span>
                </th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-slate-500 whitespace-nowrap min-w-[80px]">
                  <span className="flex items-center gap-1 sm:gap-1.5">
                    <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400" /> PO Date
                  </span>
                </th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-slate-500 whitespace-nowrap min-w-[120px]">
                  <span className="flex items-center gap-1 sm:gap-1.5">
                    <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400" /> Dispatch Date
                  </span>
                </th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold whitespace-nowrap text-right pr-2 sm:pr-6 min-w-[80px]">
                  <span className="flex items-center gap-1 sm:gap-1.5 justify-end">
                    <Scale className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400" /> Weight
                  </span>
                </th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-center whitespace-nowrap min-w-[60px]">Inv</th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-center whitespace-nowrap min-w-[70px]">Ship</th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-center whitespace-nowrap min-w-[90px]">Packing</th>
                <th className="px-2 py-2 sm:px-3 sm:py-3.5 font-semibold text-center w-10 sm:w-16">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
              {paginatedTrucks.length === 0 ? (
                <tr>
                  <td colSpan="14" className="px-4 py-12 text-center text-slate-400 bg-slate-50/50 font-normal">
                    No verified trucks found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedTrucks.map((truck, idx) => {
                  const hasInvoice = !!(truck.invoice_details?.invoice_no && truck.invoice_details?.invoice_date);
                  const invoiceMissing = [];
                  if (!truck.invoice_details?.invoice_no) invoiceMissing.push('No.');
                  if (!truck.invoice_details?.invoice_date) invoiceMissing.push('Date');

                  const hasShipping = !!(truck.shipping_details?.shipping_no && truck.shipping_details?.shipping_date);
                  const shippingMissing = [];
                  if (!truck.shipping_details?.shipping_no) shippingMissing.push('No.');
                  if (!truck.shipping_details?.shipping_date) shippingMissing.push('Date');

                  const hasPackingList = !!(truck.packing_list_details?.packing_list_no && truck.packing_list_details?.packing_list_date);
                  const packingListMissing = [];
                  if (!truck.packing_list_details?.packing_list_no) packingListMissing.push('No.');
                  if (!truck.packing_list_details?.packing_list_date) packingListMissing.push('Date');

                  return (
                    <React.Fragment key={truck.id}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${expandedRows[truck.id] ? 'bg-slate-50/40' : ''}`}>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 font-normal text-slate-400">
                          {(page - 1) * pageSize + idx + 1}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 font-mono font-bold text-slate-900 tracking-wider text-xs sm:text-sm">
                          {truck.truck_no || '-'}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 truncate max-w-[100px] sm:max-w-[150px]" title={truck.transporter}>
                          {truck.transporter || '-'}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 text-sm">
                          {(() => {
                            const source = truck.source || truck.depot || truck.company || '-';
                            return source;
                          })()}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 truncate max-w-[80px] sm:max-w-[100px] cursor-help" title={truck.company || ''}>
                          {truck.company || '-'}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5">
                          <span className="bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded text-[10px] sm:text-xs">
                            {truck.product || '-'}
                          </span>
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 font-mono font-semibold text-xs">
                          {truck.po_number ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/purchase-orders?poNumber=${encodeURIComponent(truck.po_number)}`)}
                              className="text-blue-600 hover:underline text-xs"
                            >
                              {truck.po_number}
                            </button>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 whitespace-nowrap text-slate-500 text-xs">
                          {formatDateShort(truck.po_date)}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 text-xs">
                          <div className="flex flex-col leading-tight">
                            <span className="text-slate-600 whitespace-nowrap text-xs">
                              {formatFinalDateTime(truck.final_verified_at || truck.created_at)}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Verified by: {truck.verified_by || "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 font-bold text-emerald-600 text-right pr-2 sm:pr-6 text-sm">
                          {truck.weight || '-'}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 text-center whitespace-nowrap">
                          {hasInvoice ? (
                            <span className="inline-flex flex-col items-start rounded-md px-2 py-1 text-[10px] sm:text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200" title="Invoice complete">
                              <span className="font-semibold">✓ {truck.invoice_details.invoice_no}</span>
                              <span className="text-[10px] text-slate-600">
                                {formatDateShort(truck.invoice_details.invoice_date)}
                              </span>
                              {truck.invoice_details.invoice_amount != null && (
                                <span className="text-[10px] sm:text-[11px] text-slate-800 font-semibold">
                                  {formatCurrencyAmount(truck.invoice_details.currency, truck.invoice_details.invoice_amount)}
                                </span>
                              )}
                            </span>
                          ) : canCreate ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!expandedRows[truck.id]) toggleRow(truck.id);
                                setSelectedTruck(truck);
                                setShowInvoiceForm(prev => ({ ...prev, [truck.id]: true }));
                              }}
                              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100"
                              title={`Click to add missing invoice info: ${invoiceMissing.join(', ')}`}
                            >
                              ⚠ {invoiceMissing.join(', ')}
                            </button>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200">
                              ✕ Missing
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 text-center whitespace-nowrap">
                          {hasShipping ? (
                            <span className="inline-flex flex-col items-start rounded-md px-2 py-1 text-[10px] sm:text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200" title="Shipping complete">
                              <span className="font-semibold">✓ {truck.shipping_details.shipping_no}</span>
                              <span className="text-[10px] text-slate-600">
                                {formatDateShort(truck.shipping_details.shipping_date)}
                              </span>
                              {truck.shipping_details.shipping_bill_amount != null && (
                                <span className="text-[10px] sm:text-[11px] text-slate-800 font-semibold">
                                  {formatCurrencyAmount(truck.shipping_details.currency, truck.shipping_details.shipping_bill_amount)}
                                </span>
                              )}
                            </span>
                          ) : canCreate ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!expandedRows[truck.id]) toggleRow(truck.id);
                                setSelectedTruck(truck);
                                setShowShippingForm(prev => ({ ...prev, [truck.id]: true }));
                              }}
                              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100"
                              title={`Click to add missing shipping info: ${shippingMissing.join(', ')}`}
                            >
                              ⚠ {shippingMissing.join(', ')}
                            </button>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200">
                              ✕ Missing
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 text-center whitespace-nowrap">
                          {hasPackingList ? (
                            <span className="inline-flex flex-col items-start rounded-md px-2 py-1 text-[10px] sm:text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200" title="Packing List complete">
                              <span className="font-semibold">✓ {truck.packing_list_details.packing_list_no}</span>
                              <span className="text-[10px] text-slate-600">
                                {formatDateShort(truck.packing_list_details.packing_list_date)}
                              </span>
                            </span>
                          ) : canCreate ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (!expandedRows[truck.id]) toggleRow(truck.id);
                                setSelectedTruck(truck);
                                setShowPackingListForm(prev => ({ ...prev, [truck.id]: true }));
                              }}
                              className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 cursor-pointer hover:bg-amber-100"
                              title={`Click to add missing packing list info: ${packingListMissing.join(', ')}`}
                            >
                              ⚠ {packingListMissing.join(', ')}
                            </button>
                          ) : (
                            <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold bg-red-50 text-red-500 border border-red-200">
                              ✕ Missing
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 sm:px-3 sm:py-3.5 text-center">
                          <button
                            onClick={() => setSelectedTruck(truck)}
                            className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white p-1 text-blue-600 transition-colors hover:bg-blue-50"
                          >
                            <ChevronDown className="w-3 h-3 sm:w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TruckDetailsModal
        open={!!selectedTruck}
        onClose={() => setSelectedTruck(null)}
        truck={selectedTruck}
        canCreate={canCreate}
        canUpdate={canUpdate}
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
        getFileUrl={getFileUrl}
      />

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