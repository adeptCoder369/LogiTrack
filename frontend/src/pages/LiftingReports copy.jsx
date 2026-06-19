import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { reportsApi, productsApi, companiesApi, depotsApi } from '../lib/api';
import { Calendar, Download, Filter, Truck, Train, Package, TrendingUp, ChevronDown, ChevronUp, ArrowRight, ArrowUpFromLine, Building2, Warehouse } from 'lucide-react';
import { toast } from 'sonner';

export default function LiftingReports() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [expandedDates, setExpandedDates] = useState({});
  console.log('fg',reportData)
  // Filter options
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [depots, setDepots] = useState([]);
  
  // Filters state
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    product_id: '',
    company_id: '',
    depot_id: '',
    transport_mode: '',
    lifting_type: ''
  });

  useEffect(() => {
    loadFilterOptions();
    loadReport();
  }, []);

  const loadFilterOptions = async () => {
    try {
      const [productsRes, companiesRes, depotsRes] = await Promise.all([
        productsApi.getAll(),
        companiesApi.getAll(),
        depotsApi.getAll()
      ]);
      setProducts(productsRes.data);
      setCompanies(companiesRes.data);
      setDepots(depotsRes.data);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      
      const response = await reportsApi.getDatewiseLiftings(params);
      setReportData(response.data);
    } catch (error) {
      toast.error('Failed to load report');
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    loadReport();
  };

  const handleClearFilters = () => {
    setFilters({
      date_from: '',
      date_to: '',
      product_id: '',
      company_id: '',
      depot_id: '',
      transport_mode: '',
      lifting_type: ''
    });
    setTimeout(loadReport, 100);
  };

  const handleExport = () => {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    
    const token = localStorage.getItem('token');
    const url = reportsApi.exportDatewiseLiftings(params);
    
    // Open in new tab with auth
    const link = document.createElement('a');
    link.href = `${url}&token=${token}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Exporting report...');
  };

  const toggleDateExpand = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === 'Unknown') return 'Unknown Date';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Helper to get date string in YYYY-MM-DD format
  const getDateString = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  // Get summary for a specific date
 const getDaySummary = (dateStr) => {
  if (!reportData?.data) return null;

  const dayData = reportData.data.find(d => d.date === dateStr);

  if (!dayData) return { 
    total: 0, 
    quantity: 0, 
    primary: { count: 0, qty: 0, toDepot: 0, toClient: 0 },
    secondary: { count: 0, qty: 0, toClient: 0, toDepot: 0 }
  };

  const primary = { count: 0, qty: 0, toDepot: 0, toClient: 0 };
  const secondary = { count: 0, qty: 0, toClient: 0, toDepot: 0 };

  dayData.liftings?.forEach(l => {
    const qty = l.quantity_mt || 0;

    if (l.lifting_type === 'Primary') {
      primary.count++;
      primary.qty += qty;
      if (l.unloading_point_type === 'Depot') {
        primary.toDepot += qty;
      } else {
        primary.toClient += qty;
      }
    } else {
      secondary.count++;
      secondary.qty += qty;
      if (l.unloading_point_type === 'Company') {
        secondary.toClient += qty;
      } else {
        secondary.toDepot += qty;
      }
    }
  });

  return {
    total: dayData.total_liftings || 0,
    quantity: dayData.total_quantity_mt || 0,
    primary,
    secondary
  };
};

  // Memoized day summaries
  const todaySummary = useMemo(() => getDaySummary(getDateString(0)), [reportData]);
  const yesterdaySummary = useMemo(() => getDaySummary(getDateString(1)), [reportData]);
  const dayBeforeSummary = useMemo(() => getDaySummary(getDateString(2)), [reportData]);

  // Date labels with day name
  const getDateLabel = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDateGroupStatusSummary = (dateGroup) => {
    const summary = {
      verified: 0,
      verifiedQuantity: 0,
      pending: 0,
      pendingQuantity: 0
    };

    dateGroup?.liftings?.forEach((lifting) => {
      const qty = Number(lifting.quantity_mt) || 0;
      if (lifting.unloading_status === 'Verified') {
        summary.verified += 1;
        summary.verifiedQuantity += qty;
      } else {
        summary.pending += 1;
        summary.pendingQuantity += qty;
      }
    });

    return summary;
  };

  const reportStatusSummary = useMemo(() => {
    const status = {
      verified_liftings: 0,
      verified_quantity_mt: 0,
      pending_liftings: 0,
      pending_quantity_mt: 0
    };

    reportData?.data?.forEach((dateGroup) => {
      dateGroup?.liftings?.forEach((lifting) => {
        const qty = Number(lifting.quantity_mt) || 0;
        if (lifting.unloading_status === 'Verified') {
          status.verified_liftings += 1;
          status.verified_quantity_mt += qty;
        } else {
          status.pending_liftings += 1;
          status.pending_quantity_mt += qty;
        }
      });
    });

    return status;
  }, [reportData]);

  const stockOutSummary = useMemo(() => {
    const summary = {
      liftings: 0,
      quantity_mt: 0,
      to_client_mt: 0,
      to_depot_mt: 0
    };

    reportData?.data?.forEach((dateGroup) => {
      dateGroup?.liftings?.forEach((lifting) => {
        if (lifting.lifting_type === 'Secondary') {
          const qty = Number(lifting.quantity_mt) || 0;
          summary.liftings += 1;
          summary.quantity_mt += qty;
          if (lifting.unloading_point_type === 'Company') {
            summary.to_client_mt += qty;
          } else if (lifting.unloading_point_type === 'Depot') {
            summary.to_depot_mt += qty;
          }
        }
      });
    });

    return summary;
  }, [reportData]);

  // Day Summary Card Component
  const DaySummaryCard = ({ title, dateLabel, summary, colorClass, textColorClass }) => (
    <Card className={`border-t-4 ${colorClass}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className={`text-sm font-bold ${textColorClass}`}>{title}</p>
            <p className="text-[10px] text-gray-500">{dateLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold">{summary?.total || 0}</p>
            <p className="text-xs text-gray-500">{(summary?.quantity || 0).toFixed(1)} MT</p>
          </div>
        </div>
        
        {/* Primary/Secondary Breakdown */}
        <div className="border-t pt-2 mt-2 space-y-2">
          {/* Primary */}
          <div>
            <p className="text-[10px] font-semibold text-blue-600 mb-1">Primary ({summary?.primary?.count || 0})</p>
            <div className="grid grid-cols-2 gap-1">
              <div className="bg-blue-50 rounded px-2 py-1">
                <p className="text-[9px] text-gray-500">Co.→Depot</p>
                <p className="text-xs font-semibold text-blue-700">{(summary?.primary?.toDepot || 0).toFixed(1)} MT</p>
              </div>
              <div className="bg-green-50 rounded px-2 py-1">
                <p className="text-[9px] text-gray-500">Co.→Client</p>
                <p className="text-xs font-semibold text-green-700">{(summary?.primary?.toClient || 0).toFixed(1)} MT</p>
              </div>
            </div>
          </div>
          
          {/* Secondary */}
          <div>
            <p className="text-[10px] font-semibold text-purple-600 mb-1">Secondary ({summary?.secondary?.count || 0})</p>
            <div className="grid grid-cols-2 gap-1">
              <div className="bg-purple-50 rounded px-2 py-1">
                <p className="text-[9px] text-gray-500">Depot→Client</p>
                <p className="text-xs font-semibold text-purple-700">{(summary?.secondary?.toClient || 0).toFixed(1)} MT</p>
              </div>
              <div className="bg-gray-50 rounded px-2 py-1">
                <p className="text-[9px] text-gray-500">Depot→Depot</p>
                <p className="text-xs font-semibold text-gray-700">{(summary?.secondary?.toDepot || 0).toFixed(1)} MT</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lifting Reports</h1>
          <p className="text-slate-600">Date-wise lifting analysis with filters</p>
        </div>
        <Button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700">
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Quick Day Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DaySummaryCard 
          title="TODAY" 
          dateLabel={getDateLabel(0)} 
          summary={todaySummary}
          colorClass="border-t-emerald-500"
          textColorClass="text-emerald-600"
        />
        <DaySummaryCard 
          title="YESTERDAY" 
          dateLabel={getDateLabel(1)} 
          summary={yesterdaySummary}
          colorClass="border-t-blue-500"
          textColorClass="text-blue-600"
        />
        <DaySummaryCard 
          title="DAY BEFORE YESTERDAY" 
          dateLabel={getDateLabel(2)} 
          summary={dayBeforeSummary}
          colorClass="border-t-purple-500"
          textColorClass="text-purple-600"
        />
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {/* Date From */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">From Date</label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="h-9"
              />
            </div>

            {/* Date To */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">To Date</label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="h-9"
              />
            </div>

            {/* Product */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Product</label>
              <Select value={filters.product_id || "all"} onValueChange={(v) => handleFilterChange('product_id', v === "all" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Company */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Company</label>
              <Select value={filters.company_id || "all"} onValueChange={(v) => handleFilterChange('company_id', v === "all" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Depot */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Depot</label>
              <Select value={filters.depot_id || "all"} onValueChange={(v) => handleFilterChange('depot_id', v === "all" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Depots" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Depots</SelectItem>
                  {depots.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Transport Mode */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Transport</label>
              <Select value={filters.transport_mode || "all"} onValueChange={(v) => handleFilterChange('transport_mode', v === "all" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Modes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modes</SelectItem>
                  <SelectItem value="Road">Road</SelectItem>
                  <SelectItem value="Railway">Railway</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lifting Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Type</label>
              <Select value={filters.lifting_type || "all"} onValueChange={(v) => handleFilterChange('lifting_type', v === "all" ? "" : v)}>
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
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters} disabled={loading}>
              Apply Filters
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-medium">Total Days</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{reportData.summary.total_dates}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-medium">Total Liftings</span>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{reportData.summary.total_liftings}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">Total Quantity</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{reportData.summary.total_quantity_mt.toFixed(2)} MT</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">Net Weight</span>
              </div>
              <p className="text-2xl font-bold text-amber-900">{reportData.summary.total_net_weight_mt.toFixed(2)} MT</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs font-medium">Verified Dispatch</span>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{reportStatusSummary.verified_liftings}</p>
              <p className="text-xs text-slate-500 mt-1">{reportStatusSummary.verified_quantity_mt.toFixed(2)} MT</p>
            </CardContent>
          </Card>

          {/* <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <ArrowUpFromLine className="w-4 h-4" />
                <span className="text-xs font-medium">Stock Out</span>
              </div>
              <p className="text-2xl font-bold text-red-900">{stockOutSummary.liftings}</p>
              <p className="text-xs text-slate-500 mt-1">{stockOutSummary.quantity_mt.toFixed(2)} MT</p>
              <div className="mt-2 text-[10px] space-y-1">
                <div className="flex justify-between text-slate-500">
                  <span>To Client</span>
                  <span>{stockOutSummary.to_client_mt.toFixed(2)} MT</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>To Depot</span>
                  <span>{stockOutSummary.to_depot_mt.toFixed(2)} MT</span>
                </div>
              </div>
            </CardContent>
          </Card> */}

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-slate-600 mb-1">
                <Truck className="w-4 h-4" />
                <span className="text-xs font-medium">Road</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">{reportData.summary.by_transport_mode.Road}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <Train className="w-4 h-4" />
                <span className="text-xs font-medium">Railway</span>
              </div>
              <p className="text-2xl font-bold text-orange-900">{reportData.summary.by_transport_mode.Railway}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Date-wise Data */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 mt-2">Loading report...</p>
        </div>
      ) : reportData?.data?.length > 0 ? (
        <div className="space-y-4">
          {reportData.data.map((dateGroup) => (
            <Card key={dateGroup.date} className="overflow-hidden">
              <div 
                className="flex items-center justify-between p-4 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                onClick={() => toggleDateExpand(dateGroup.date)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{formatDate(dateGroup.date)}</h3>
                    <p className="text-sm text-slate-600">
                      {dateGroup.total_liftings} liftings • {dateGroup.total_quantity_mt.toFixed(2)} MT
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {(() => {
                        const status = getDateGroupStatusSummary(dateGroup);
                        return `${status.verified} verified • ${status.pending} pending • ${status.verifiedQuantity.toFixed(1)} MT verified`;
                      })()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    {Object.entries(dateGroup.by_product).slice(0, 3).map(([product, data]) => (
                      <span key={product} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {product}: {data.quantity_mt.toFixed(1)} MT
                      </span>
                    ))}
                  </div>
                  {expandedDates[dateGroup.date] ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {expandedDates[dateGroup.date] && (
                <div className="border-t">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">Lifting No</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">DO No.</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">Type</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">Mode</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">Product</th>
                          <th className="px-4 py-2 text-right font-medium text-slate-600">Qty (MT)</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">Vehicle/Siding</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">From</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">To</th>
                          <th className="px-4 py-2 text-left font-medium text-slate-600">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dateGroup.liftings.map((lifting) => (
                          <tr key={lifting.id} className="border-b hover:bg-slate-50">
                            <td className="px-4 py-2 font-medium">{lifting.lifting_no}</td>
                            <td className="px-4 py-2">
                                {lifting.lifting_type === 'Primary'
                                  ? (lifting.delivery_order_no || '-')
                                  : '-'}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                lifting.lifting_type === 'Primary' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {lifting.lifting_type}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="flex items-center gap-1">
                                {lifting.transport_mode === 'Railway' ? (
                                  <Train className="w-3 h-3 text-orange-600" />
                                ) : (
                                  <Truck className="w-3 h-3 text-slate-600" />
                                )}
                                {lifting.transport_mode || 'Road'}
                              </span>
                            </td>
                            <td className="px-4 py-2">{lifting.product_name || '-'}</td>
                            <td className="px-4 py-2 text-right font-medium">{lifting.quantity_mt}</td>
                            <td className="px-4 py-2">
                              {lifting.transport_mode === 'Railway' 
                                ? lifting.loading_siding_name 
                                : lifting.vehicle_number || '-'}
                            </td>
                            <td className="px-4 py-2">{lifting.loading_point_name || '-'}</td>
                            <td className="px-4 py-2">{lifting.unloading_point_name || '-'}</td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                lifting.unloading_status === 'Verified' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {lifting.unloading_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600">No lifting data found for the selected filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
