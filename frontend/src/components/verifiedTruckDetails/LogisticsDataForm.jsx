import React from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';

// If you have a global api utility helper like getFileUrl from your system, import it here:
// import { getFileUrl } from '../lib/api'; 
// Otherwise, we will use your local absolute fallback string setup.

export const LogisticsDataForm = ({
    type, // 'invoice', 'shipping', or 'packingList'
    truckId,
    formData,
    updateForm,
    onSubmit,
    onCancel
}) => {
    const isInvoice = type === 'invoice';
    const isShipping = type === 'shipping';
    const isPackingList = type === 'packingList';
    const labelPrefix = isInvoice ? 'Invoice' : isShipping ? 'Shipping' : 'Packing List';

    // Build the resource destination link for both local states and database keys
    const getDocumentUrl = () => {
        // Case 1: A brand new file was just chosen by the user in this session
        if (formData?.file instanceof File) {
            return URL.createObjectURL(formData.file);
        }

        // Case 2: Reading the existing file reference from your database payload
        const savedFileId = formData?.file_id || formData?.do_copy_file_id || formData?.invoice_copy_id || formData?.file;
        
        if (savedFileId && typeof savedFileId === 'string') {
            // If the backend returned a full absolute web address string directly
            if (savedFileId.startsWith('http://') || savedFileId.startsWith('https://')) {
                return savedFileId;
            }
            // Fallback to your local Node Express storage upload path routing
            return `http://localhost:8000/api/uploads/${savedFileId}`;
        }
        
        return null;
    };

    const targetUrl = getDocumentUrl();
    const isStagedLocalFile = formData?.file instanceof File;

    // Helper to identify if the resource is a standard renderable image format
    const isImageFile = (url) => {
        if (!url) return false;
        return url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) || url.includes('_saturn') || url.includes('/uploads/');
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(truckId);
            }}
            className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm max-w-xl"
        >
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs font-medium text-slate-700">{labelPrefix} No. *</Label>
                    <Input
                        required
                        placeholder={isInvoice ? "e.g. INV/2026/0042" : isShipping ? "e.g. SH-BL-9081" : "e.g. PL/2026/001"}
                        value={formData?.number || formData?.invoiceNo || formData?.shippingNo || formData?.packingListNo || ''}
                        onChange={(e) => updateForm(`${type}_${truckId}`, isInvoice ? 'invoiceNo' : isShipping ? 'shippingNo' : 'packingListNo', e.target.value)}
                        className="h-8 text-xs mt-1"
                    />
                </div>
                <div>
                    <Label className="text-xs font-medium text-slate-700">{labelPrefix} Date *</Label>
                    <Input
                        required
                        type="date"
                        value={formData?.date || formData?.invoiceDate || formData?.shippingDate || formData?.packingListDate || ''}
                        onChange={(e) => updateForm(`${type}_${truckId}`, isInvoice ? 'invoiceDate' : isShipping ? 'shippingDate' : 'packingListDate', e.target.value)}
                        className="h-8 text-xs mt-1"
                    />
                </div>
            </div>
            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs font-medium text-slate-700">{labelPrefix} Amount</Label>
                    <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={isInvoice ? "Invoice Amount" : "Shipping Bill Amount"}
                        value={formData?.invoiceAmount || formData?.invoice_amount || formData?.shippingBillAmount || formData?.shipping_bill_amount || ''}
                        onChange={(e) => updateForm(`${type}_${truckId}`, isInvoice ? 'invoiceAmount' : 'shippingBillAmount', e.target.value)}
                        className="h-8 text-xs mt-1"
                    />
                </div>
            </div> */}
            {!isPackingList && <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
  <div className="flex flex-col gap-1">
    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
      {labelPrefix} Amount
    </Label>
    
    {/* Combined Flex Container for Dropdown and Number Field */}
    <div className="flex items-center shadow-sm rounded-lg border border-slate-200 focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-400 overflow-hidden bg-white h-10 mt-0.5 transition-all">
      
      {/* 1. Currency Unit Selection Dropdown */}
      <div className="relative border-r border-slate-200 bg-slate-50 h-full flex items-center">
        <select
          value={formData?.currency || 'INR'}
          onChange={(e) => updateForm(`${type}_${truckId}`, 'currency', e.target.value)}
          className="bg-transparent pl-3 pr-7 h-full text-xs font-bold text-slate-700 outline-none appearance-none cursor-pointer select-none"
        >
          <option value="INR">₹ INR</option>
          <option value="USD">$ USD</option>
          <option value="EUR">€ EUR</option>
          <option value="AED">د.إ AED</option>
          <option value="GBP">£ GBP</option>
        </select>
        {/* Subtle select indicator icon arrow */}
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 pointer-events-none">▼</span>
      </div>

      {/* 2. Numeric Amount Input Field */}
      <Input
        type="number"
        step="0.01"
        min="0"
        placeholder={isInvoice ? "Enter Invoice Amount" : "Enter Shipping Bill Amount"}
        value={formData?.invoiceAmount || formData?.invoice_amount || formData?.shippingBillAmount || formData?.shipping_bill_amount || ''}
        onChange={(e) => updateForm(`${type}_${truckId}`, isInvoice ? 'invoiceAmount' : 'shippingBillAmount', e.target.value)}
        className="flex-1 h-full border-0 rounded-none bg-transparent text-xs font-semibold text-slate-700 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 placeholder:text-slate-400"
      />
    </div>
  </div>
</div>}
            <div>
                <Label className="text-xs font-medium text-slate-700">{isPackingList ? 'Remarks' : 'Comments'}</Label>
                <textarea
                    rows="2"
                    placeholder={isPackingList ? `Add packing list notes...` : `Add additional ${type} notes...`}
                    className="w-full text-xs p-2 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1"
                    value={formData?.comments || formData?.remarks || ''}
                    onChange={(e) => updateForm(`${type}_${truckId}`, isPackingList ? 'remarks' : 'comments', e.target.value)}
                />
            </div>
            <div>
                <Label className="text-xs font-medium text-slate-700">Upload {isInvoice ? 'Invoice Copy' : isShipping ? 'Manifest / LR' : 'Packing List Copy'}</Label>
                <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mt-1"
                    onChange={(e) => updateForm(`${type}_${truckId}`, 'file', e.target.files?.[0])}
                />
                
                {/* Preview and Existing Document Meta Frame Container */}
                {targetUrl && (
                    <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                                {isImageFile(targetUrl) ? (
                                    <ImageIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                ) : (
                                    <FileText className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                )}
                                <span className="text-[11px] font-medium text-slate-600 truncate">
                                    {isStagedLocalFile ? `Staged: ${formData.file.name}` : "Previously Saved Document"}
                                </span>
                            </div>
                            <a 
                                href={targetUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold shrink-0 flex items-center gap-0.5 bg-white px-2 py-1 rounded border border-slate-200 shadow-sm"
                            >
                                View Original <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                        </div>

                        {/* Interactive Visual Thumbnail Engine */}
                        {isImageFile(targetUrl) && (
                            <div className="relative w-28 h-28 border border-slate-200 rounded-md overflow-hidden bg-white shadow-inner group">
                                <img 
                                    src={targetUrl} 
                                    alt="Document Visual Target Preview" 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // Hide layout clean if asset routing breaks or is a PDF with complex layout signatures
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}
                        {/* Show registered amount if present */}
                        {(formData?.invoiceAmount || formData?.invoice_amount) && isInvoice && (
                            <div className="text-[11px] text-slate-600 mt-2">Amount: {formData.invoiceAmount || formData.invoice_amount}</div>
                        )}
                        {(formData?.shippingBillAmount || formData?.shipping_bill_amount) && !isInvoice && (
                            <div className="text-[11px] text-slate-600 mt-2">Amount: {formData.shippingBillAmount || formData.shipping_bill_amount}</div>
                        )}
                    </div>
                )}
                            {!formData?.file && (formData?.fileName || formData?.file_id || formData?.fileId) && (
                                <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1">
                                    ✓ Registered: {formData.fileName || formData.file_id || formData.fileId}
                                </div>
                            )}
            </div>
            <div className="flex gap-2 justify-end pt-1">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button type="submit" size="sm" className="h-7 text-xs bg-slate-900 hover:bg-slate-800">
                    Save {labelPrefix}
                </Button>
            </div>
        </form>
    );
};