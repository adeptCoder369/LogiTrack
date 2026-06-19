import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { X, Calendar, Search, Building2, Warehouse, SlidersHorizontal } from 'lucide-react';

export default function FilterPanel({
  filters,
  setFilters,
  depots,
  companies,
  products,
  clearFilters,
  hasActiveFilters
}) {
  return (
    <div className="w-full p-5 bg-card border border-border rounded-xl shadow-sm space-y-5 transition-all duration-200">
      {/* Header Info Block */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2 text-foreground font-semibold text-sm tracking-wide uppercase">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span>Filters</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive transition-colors rounded-lg"
            onClick={clearFilters}
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Clear active filters
          </Button>
        )}
      </div>

      {/* Main Filter Fields Layout */}
      <div className="grid gap-x-4 gap-y-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-end">
        {/* From Date */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
            From Date
          </Label>
          <div className="relative">
            <Input
              type="date"
              className="w-full cursor-pointer focus-visible:ring-primary h-10 pr-3 text-sm rounded-lg"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>
        </div>

        {/* To Date */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" />
            To Date
          </Label>
          <div className="relative">
            <Input
              type="date"
              className="w-full cursor-pointer focus-visible:ring-primary h-10 pr-3 text-sm rounded-lg"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
        </div>

        {/* PO Number */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-muted-foreground/70" />
            PO Number
          </Label>
          <div className="relative">
            <Input
              placeholder="Search PO number..."
              className="w-full focus-visible:ring-primary h-10 text-sm rounded-lg pl-3"
              value={filters.poNumber}
              onChange={(e) => setFilters({ ...filters, poNumber: e.target.value })}
            />
          </div>
        </div>

        {/* Depot */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Warehouse className="w-3.5 h-3.5 text-muted-foreground/70" />
            Depot
          </Label>
          <Select
            value={filters.depotId}
            onValueChange={(value) => setFilters({ ...filters, depotId: value })}
          >
            <SelectTrigger className="w-full h-10 text-sm rounded-lg focus:ring-primary">
              <SelectValue placeholder="All depots" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all" className="font-medium">All depots</SelectItem>
              {depots.map((depot) => (
                <SelectItem key={depot.id} value={depot.id}>
                  {depot.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Company */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground/70" />
            Company
          </Label>
          <Select
            value={filters.companyId}
            onValueChange={(value) => setFilters({ ...filters, companyId: value })}
          >
            <SelectTrigger className="w-full h-10 text-sm rounded-lg focus:ring-primary">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all" className="font-medium">All companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 inline-block" />
            Product
          </Label>
          <Select
            value={filters.productId}
            onValueChange={(value) => setFilters({ ...filters, productId: value })}
          >
            <SelectTrigger className="w-full h-10 text-sm rounded-lg focus:ring-primary">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="all" className="font-medium">All products</SelectItem>
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.product_name || p.name || p.product_code || p.productCode || p.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 inline-block" />
            Status
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger className="w-full h-10 text-sm rounded-lg focus:ring-primary">
              <SelectValue placeholder="All status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-medium">All status</SelectItem>
              <SelectItem value="Pending" className="text-amber-600 dark:text-amber-500 focus:text-amber-600">Pending</SelectItem>
              <SelectItem value="In Progress" className="text-blue-600 dark:text-blue-500 focus:text-blue-600">In Progress</SelectItem>
              <SelectItem value="Completed" className="text-emerald-600 dark:text-emerald-500 focus:text-emerald-600">Completed</SelectItem>
              <SelectItem value="Cancelled" className="text-rose-600 dark:text-rose-500 focus:text-rose-600">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}