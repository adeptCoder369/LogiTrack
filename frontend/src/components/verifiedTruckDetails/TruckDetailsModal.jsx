import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import {
  FileText,
  FileCheck,
  Plus,
  Edit2,
  Phone,
  MapPin,
  UserCheck,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import { LogisticsDataForm } from './LogisticsDataForm';

const currencySymbols = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  AED: 'د.إ',
  GBP: '£',
};

const formatCurrencyLabel = (currency = 'INR') => {
  const code = currency || 'INR';
  const symbol = currencySymbols[code] || '';
  return `${symbol ? `${symbol} ` : ''}${code}`;
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
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

export const TruckDetailsModal = ({
  open,
  onClose,
  truck,
  canCreate,
  canUpdate,
  showInvoiceForm = {},
  showShippingForm = {},
  showPackingListForm = {},
  setShowInvoiceForm,
  setShowShippingForm,
  setShowPackingListForm,
  forms = {},
  updateForm,
  handleInvoiceSubmit,
  handleShippingSubmit,
  handlePackingListSubmit,
  getFileUrl,
}) => {
  if (!truck) return null;

  const invoiceDetails = truck.invoice_details || {};
  const shippingDetails = truck.shipping_details || {};
  const packingListDetails = truck.packing_list_details || {};

  const hasInvoice = !!(invoiceDetails.invoice_no && invoiceDetails.invoice_date);
  const hasShipping = !!(shippingDetails.shipping_no && shippingDetails.shipping_date);
  const hasPackingList = !!(packingListDetails.packing_list_no && packingListDetails.packing_list_date);

  const invoiceMissing = [];
  if (!truck.invoice_details?.invoice_no) invoiceMissing.push('No.');
  if (!truck.invoice_details?.invoice_date) invoiceMissing.push('Date');

  const shippingMissing = [];
  if (!truck.shipping_details?.shipping_no) shippingMissing.push('No.');
  if (!truck.shipping_details?.shipping_date) shippingMissing.push('Date');

  const packingListMissing = [];
  if (!truck.packing_list_details?.packing_list_no) packingListMissing.push('No.');
  if (!truck.packing_list_details?.packing_list_date) packingListMissing.push('Date');

  const renderSection = ({
    title,
    icon: Icon,
    tone,
    showForm,
    setShowForm,
    hasData,
    missingFields,
    type,
    formKey,
    onSubmit,
    onCancel,
    summary,
    autoFocusField,
  }) => {
    const canEdit = hasData ? canUpdate : canCreate;

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className={`rounded-lg p-2 ${tone}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
              <p className="text-[11px] text-slate-500">{hasData ? 'Saved details' : 'Add details here'}</p>
            </div>
          </div>
          {!showForm && canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowForm(prev => ({ ...prev, [truck.id]: true }))}
            >
              {hasData ? <><Edit2 className="mr-1 h-3 w-3" /> Edit</> : <><Plus className="mr-1 h-3 w-3" /> Add</>}
            </Button>
          )}
        </div>

        {showForm ? (
          <LogisticsDataForm
            type={type}
            truckId={truck.id}
            formData={forms[`${formKey}_${truck.id}`]}
            updateForm={updateForm}
            onSubmit={onSubmit}
            onCancel={() => setShowForm(prev => ({ ...prev, [truck.id]: false }))}
            autoFocusField={autoFocusField}
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-600">
              {hasData ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold">Complete</span>
                </div>
                {summary}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-amber-700">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold">Missing: {missingFields.join(', ')}</span>
                </div>
                <p className="text-xs text-slate-500">Fill the form to save the details for this truck.</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const isImageUrl = (url) => {
    if (!url) return false;
    return url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || url.includes('_saturn') || url.includes('/uploads/');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-900">
            {truck.truck_no || 'Truck details'}
          </DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Review and update the invoice, shipping, and packing-list details for this verified truck.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Phone className="h-3.5 w-3.5" /> Driver Mobile
              </div>
              <div className="text-sm font-semibold text-slate-800">{truck.driver_mobile || '-'}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <MapPin className="h-3.5 w-3.5" /> Depot Destination
              </div>
              <div className="text-sm font-semibold text-slate-800">{truck.depot || '-'}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <UserCheck className="h-3.5 w-3.5" /> Verified By
              </div>
              <div className="text-sm font-semibold text-slate-800">{truck.verified_by || '-'}</div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Attached Slips
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {truck.tare_slip_file_id ? (
                  <button
                    type="button"
                    onClick={() => window.open(getFileUrl(truck.tare_slip_file_id), '_blank')}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                  >
                    <ExternalLink className="h-3 w-3" /> Tare Slip
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">No tare slip</span>
                )}
                {truck.weightment_slip_file_id ? (
                  <button
                    type="button"
                    onClick={() => window.open(getFileUrl(truck.weightment_slip_file_id), '_blank')}
                    className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700"
                  >
                    <ExternalLink className="h-3 w-3" /> Weightment
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">No weightment slip</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {renderSection({
              title: 'Invoice',
              icon: FileText,
              tone: 'bg-blue-50 text-blue-700',
              showForm: showInvoiceForm[truck.id],
              setShowForm: setShowInvoiceForm,
              hasData: hasInvoice,
              missingFields: invoiceMissing,
              type: 'invoice',
              formKey: 'invoice',
              onSubmit: handleInvoiceSubmit,
              autoFocusField: invoiceMissing.includes('No.') ? 'number' : 'date',
              summary: (
                <>
                  <p><span className="text-slate-500">Invoice No:</span> <span className="font-semibold text-slate-800">{invoiceDetails.invoice_no || '-'}</span></p>
                  <p><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-800">{formatDateShort(invoiceDetails.invoice_date)}</span></p>
                  {invoiceDetails.comments && <p><span className="text-slate-500">Comments:</span> <span className="italic text-slate-600">{invoiceDetails.comments}</span></p>}
                  {invoiceDetails.invoice_amount != null && (
                    <p><span className="text-slate-500">Amount:</span> <span className="font-semibold text-slate-800">{formatCurrencyLabel(invoiceDetails.currency)} {Number(invoiceDetails.invoice_amount).toFixed(2)}</span></p>
                  )}
                  {invoiceDetails.file_id && (
                    <div className="flex items-center gap-2">
                      {isImageUrl(getFileUrl(invoiceDetails.file_id)) ? (
                        <img src={getFileUrl(invoiceDetails.file_id)} alt="invoice" className="w-12 h-12 object-cover rounded-md border" />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center rounded-md border bg-white text-[11px] text-slate-600">PDF</div>
                      )}
                      <div className="text-xs text-slate-700 font-medium truncate max-w-[180px]">{invoiceDetails.file_name || invoiceDetails.file_id}</div>
                      <Button size="sm" variant="outline" className="h-7 text-xs ml-2" onClick={() => setShowInvoiceForm(prev => ({ ...prev, [truck.id]: true }))}>
                        <Edit2 className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <a href={getFileUrl(invoiceDetails.file_id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 ml-2">
                        <ExternalLink className="h-3 w-3" /> View
                      </a>
                    </div>
                  )}
                </>
              ),
            })}

            {renderSection({
              title: 'Shipping Bill',
              icon: FileCheck,
              tone: 'bg-slate-100 text-slate-700',
              showForm: showShippingForm[truck.id],
              setShowForm: setShowShippingForm,
              hasData: hasShipping,
              missingFields: shippingMissing,
              type: 'shipping',
              formKey: 'shipping',
              onSubmit: handleShippingSubmit,
              autoFocusField: shippingMissing.includes('No.') ? 'number' : 'date',
              summary: (
                <>
                  <p><span className="text-slate-500">Shipping No:</span> <span className="font-semibold text-slate-800">{shippingDetails.shipping_no || '-'}</span></p>
                  <p><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-800">{formatDateShort(shippingDetails.shipping_date)}</span></p>
                  {shippingDetails.comments && <p><span className="text-slate-500">Comments:</span> <span className="italic text-slate-600">{shippingDetails.comments}</span></p>}
                  {shippingDetails.shipping_bill_amount != null && (
                    <p><span className="text-slate-500">Amount:</span> <span className="font-semibold text-slate-800">{formatCurrencyLabel(shippingDetails.currency)} {Number(shippingDetails.shipping_bill_amount).toFixed(2)}</span></p>
                  )}
                  {shippingDetails.file_id && (
                    <div className="flex items-center gap-2">
                      {isImageUrl(getFileUrl(shippingDetails.file_id)) ? (
                        <img src={getFileUrl(shippingDetails.file_id)} alt="shipping" className="w-12 h-12 object-cover rounded-md border" />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center rounded-md border bg-white text-[11px] text-slate-600">PDF</div>
                      )}
                      <div className="text-xs text-slate-700 font-medium truncate max-w-[180px]">{shippingDetails.file_name || shippingDetails.file_id}</div>
                      <Button size="sm" variant="outline" className="h-7 text-xs ml-2" onClick={() => setShowShippingForm(prev => ({ ...prev, [truck.id]: true }))}>
                        <Edit2 className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <a href={getFileUrl(shippingDetails.file_id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 ml-2">
                        <ExternalLink className="h-3 w-3" /> View
                      </a>
                    </div>
                  )}
                </>
              ),
            })}

            {renderSection({
              title: 'Packing List',
              icon: FileText,
              tone: 'bg-purple-50 text-purple-700',
              showForm: showPackingListForm[truck.id],
              setShowForm: setShowPackingListForm,
              hasData: hasPackingList,
              missingFields: packingListMissing,
              type: 'packingList',
              formKey: 'packingList',
              onSubmit: handlePackingListSubmit,
              autoFocusField: packingListMissing.includes('No.') ? 'number' : 'date',
              summary: (
                <>
                  <p><span className="text-slate-500">Packing List No:</span> <span className="font-semibold text-slate-800">{packingListDetails.packing_list_no || '-'}</span></p>
                  <p><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-800">{formatDateShort(packingListDetails.packing_list_date)}</span></p>
                  {packingListDetails.remarks && <p><span className="text-slate-500">Remarks:</span> <span className="italic text-slate-600">{packingListDetails.remarks}</span></p>}
                  {packingListDetails.file_id && (
                      <div className="flex items-center gap-2">
                        {isImageUrl(getFileUrl(packingListDetails.file_id)) ? (
                          <img src={getFileUrl(packingListDetails.file_id)} alt="packing" className="w-12 h-12 object-cover rounded-md border" />
                        ) : (
                          <div className="w-12 h-12 flex items-center justify-center rounded-md border bg-white text-[11px] text-slate-600">PDF</div>
                        )}
                        <div className="text-xs text-slate-700 font-medium truncate max-w-[180px]">{packingListDetails.file_name || packingListDetails.file_id}</div>
                        <Button size="sm" variant="outline" className="h-7 text-xs ml-2" onClick={() => setShowPackingListForm(prev => ({ ...prev, [truck.id]: true }))}>
                          <Edit2 className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <a href={getFileUrl(packingListDetails.file_id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 ml-2">
                          <ExternalLink className="h-3 w-3" /> View
                        </a>
                      </div>
                  )}
                </>
              ),
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
