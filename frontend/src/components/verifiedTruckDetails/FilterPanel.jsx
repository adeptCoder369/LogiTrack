import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function VerifiedTruckDetailsFilterPanel({ filters, setFilters, setPage }) {
  // Collapsible toggle state (Defaults to closed to save maximum screen space)
  const [isOpen, setIsOpen] = useState(false);

  // Centralized helper to handle standard input mutations cleanly
  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // Check if any filter has active data to display a reset button or status indicator
  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  const getDefaultDateRange = () => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 2);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { dateFrom: fmt(from), dateTo: fmt(to) };
  };

  const handleReset = () => {
    const defaults = getDefaultDateRange();
    setFilters({
      truckNo: '',
      transporter: '',
      driverMobile: '',
      company: '',
      product: '',
      poNumber: '',
      poDate: '',
      dateFrom: defaults.dateFrom,
      dateTo: defaults.dateTo,
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
    setPage(1);
  };

  return (
    <Card className="mb-6 border border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl transition-all duration-200">

      {/* Clickable Header Action Bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 sm:px-5 py-4 bg-slate-50/60 flex items-center justify-between cursor-pointer select-none hover:bg-slate-50 transition-colors gap-2"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-1.5 rounded-lg border transition-colors shrink-0 ${hasActiveFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}>
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-800 text-sm tracking-wide flex items-center gap-2 truncate">
              Filters
              {hasActiveFilters && (
                <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                  Active
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
              {isOpen ? "Click to collapse and hide control panel" : "Click to expand search and operational parameters"}
            </p>
          </div>
        </div>

        {/* Right Controls Container */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 px-2 sm:px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold rounded-lg gap-1.5 text-[10px] uppercase tracking-wider transition-colors"
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span className="hidden xs:inline">Reset Filters</span>
            </Button>
          )}

          {/* Collapse/Expand Indicator Chevron */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 transition-colors"
            aria-label="Toggle filter panel"
          >
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Dynamic Collapsible Grid Section with Scroll Support for Long Content */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'border-t border-slate-100 opacity-100' : 'max-h-0 opacity-0'}`}>
        <CardContent className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">

            {/* TRUCK NO */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Truck No.
              </Label>
              <Input
                placeholder="e.g. BR-06"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.truckNo || ''}
                onChange={(e) => updateFilter('truckNo', e.target.value)}
              />
            </div>

            {/* VERIFIED DATE FROM */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Verified Date (From)
              </Label>
              <Input
                type="date"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.dateFrom || getDefaultDateRange().dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
              />
            </div>

            {/* VERIFIED DATE TO */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Verified Date (To)
              </Label>
              <Input
                type="date"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.dateTo || getDefaultDateRange().dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
              />
            </div>

            {/* TRANSPORTER */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Transporter
              </Label>
              <Input
                placeholder="Transporter name"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.transporter || ''}
                onChange={(e) => updateFilter('transporter', e.target.value)}
              />
            </div>

            {/* DRIVER MOBILE */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Driver Mobile
              </Label>
              <Input
                placeholder="Phone number"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.driverMobile || ''}
                onChange={(e) => updateFilter('driverMobile', e.target.value)}
              />
            </div>

            {/* COMPANY */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Company
              </Label>
              <Input
                placeholder="Company name"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.company || ''}
                onChange={(e) => updateFilter('company', e.target.value)}
              />
            </div>

            {/* PRODUCT */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Product
              </Label>
              <Input
                placeholder="Product name"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.product || ''}
                onChange={(e) => updateFilter('product', e.target.value)}
              />
            </div>

            {/* PO NUMBER */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                PO Number
              </Label>
              <Input
                placeholder="PO-XXXXXX"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.poNumber || ''}
                onChange={(e) => updateFilter('poNumber', e.target.value)}
              />
            </div>

            {/* PO DATE */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                PO Date
              </Label>
              <Input
                type="date"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.poDate || ''}
                onChange={(e) => updateFilter('poDate', e.target.value)}
              />
            </div>

            {/* DEPOT */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Depot
              </Label>
              <Input
                placeholder="Depot name"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.depot || ''}
                onChange={(e) => updateFilter('depot', e.target.value)}
              />
            </div>

            {/* VERIFIED BY */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Verified By
              </Label>
              <Input
                placeholder="Officer name"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.verifiedBy || ''}
                onChange={(e) => updateFilter('verifiedBy', e.target.value)}
              />
            </div>

            {/* INVOICE NO */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Invoice No.
              </Label>
              <Input
                placeholder="e.g. INV/2026/0042"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.invoiceNo || ''}
                onChange={(e) => updateFilter('invoiceNo', e.target.value)}
              />
            </div>

            {/* INVOICE DATE */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Invoice Date
              </Label>
              <Input
                type="date"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.invoiceDate || ''}
                onChange={(e) => updateFilter('invoiceDate', e.target.value)}
              />
            </div>

            {/* INVOICE AMOUNT */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Invoice Amount
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.invoiceAmount || ''}
                onChange={(e) => updateFilter('invoiceAmount', e.target.value)}
              />
            </div>

            {/* SHIPPING NO */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Shipping No.
              </Label>
              <Input
                placeholder="e.g. SH-BL-9081"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.shippingNo || ''}
                onChange={(e) => updateFilter('shippingNo', e.target.value)}
              />
            </div>

            {/* SHIPPING DATE */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Shipping Date
              </Label>
              <Input
                type="date"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.shippingDate || ''}
                onChange={(e) => updateFilter('shippingDate', e.target.value)}
              />
            </div>

            {/* SHIPPING AMOUNT */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Shipping Amount
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Amount"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.shippingAmount || ''}
                onChange={(e) => updateFilter('shippingAmount', e.target.value)}
              />
            </div>

            {/* INVOICE UPLOAD STATUS */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Invoice Upload Status
              </Label>
              <div className="relative w-full">
                <select
                  value={filters.invoiceHasUploads || ''}
                  onChange={(e) => updateFilter('invoiceHasUploads', e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg h-10 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none transition-colors appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">All Upload Records</option>
                  <option value="yes">📦 Has Uploaded Documents</option>
                  <option value="no">⚠️ No Uploaded Documents</option>
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[9px]">▼</span>
              </div>
            </div>

            {/* SHIPPING UPLOAD STATUS */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Shipping Upload Status
              </Label>
              <div className="relative w-full">
                <select
                  value={filters.shippingHasUploads || ''}
                  onChange={(e) => updateFilter('shippingHasUploads', e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg h-10 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none transition-colors appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">All Upload Records</option>
                  <option value="yes">📦 Has Uploaded Documents</option>
                  <option value="no">⚠️ No Uploaded Documents</option>
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[9px]">▼</span>
              </div>
            </div>

            {/* PACKING LIST NO */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Packing List No.
              </Label>
              <Input
                placeholder="e.g. PL/2026/001"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.packingListNo || ''}
                onChange={(e) => updateFilter('packingListNo', e.target.value)}
              />
            </div>

            {/* PACKING LIST DATE */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Packing List Date
              </Label>
              <Input
                type="date"
                className="h-10 border-slate-200 text-slate-700 font-semibold text-xs rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 bg-white shadow-sm"
                value={filters.packingListDate || ''}
                onChange={(e) => updateFilter('packingListDate', e.target.value)}
              />
            </div>

            {/* PACKING LIST UPLOAD STATUS */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-0.5 select-none">
                Packing List Upload Status
              </Label>
              <div className="relative w-full">
                <select
                  value={filters.packingListHasUploads || ''}
                  onChange={(e) => updateFilter('packingListHasUploads', e.target.value)}
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg h-10 pl-3 pr-8 text-xs font-semibold text-slate-700 outline-none transition-colors appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">All Upload Records</option>
                  <option value="yes">📦 Has Uploaded Documents</option>
                  <option value="no">⚠️ No Uploaded Documents</option>
                </select>
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[9px]">▼</span>
              </div>
            </div>

          </div>
        </CardContent>
      </div>
    </Card>
  );
}