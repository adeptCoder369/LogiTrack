import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  // Memoized day summaries (kept for backward compatibility if needed)
  // const todaySummary = useMemo(() => getDaySummary(getDateString(0)), [reportData]);
  // const yesterdaySummary = useMemo(() => getDaySummary(getDateString(1)), [reportData]);
  // const dayBeforeSummary = useMemo(() => getDaySummary(getDateString(2)), [reportData]);

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

  // Day Summary Card Component - Table format with Product, Depot, Stock In/Out
  const DaySummaryCard = ({ title, dateLabel, dateStr, colorClass, textColorClass }) => {
    if (!reportData?.data) return null;

    const dayData = reportData.data.find(d => d.date === dateStr);
    if (!dayData || !dayData.liftings || dayData.liftings.length === 0) {
      return (
        <Card className={`border-t-4 ${colorClass}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className={`text-sm font-bold ${textColorClass}`}>{title}</p>
                <p className="text-[10px] text-gray-500">{dateLabel}</p>
              </div>
            </div>
            <div className="text-center py-6 text-gray-500">
              <p>No liftings recorded</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Group liftings by Product, Depot, and Company
    const groupedData = {};
    dayData.liftings?.forEach(lifting => {
      const product = lifting.product_name || 'Unknown';
      const depot = lifting.lifting_type === 'Primary'
        ? lifting.unloading_point_name || 'Unknown'
        : lifting.loading_point_name || 'Unknown';
      const company = lifting.lifting_type === 'Primary'
        ? lifting.loading_point_name || 'Unknown'
        : lifting.unloading_point_name || 'Unknown';
      const key = `${product}|${depot}|${company}`;

      if (!groupedData[key]) {
        groupedData[key] = {
          product,
          depot,
          company,
          stockIn: [],
          stockOut: []
        };
      }

      if (lifting.lifting_type === 'Primary') {
        groupedData[key].stockIn.push(lifting);
      } else if (lifting.lifting_type === 'Secondary' || lifting.lifting_type === 'Pickup') {
        groupedData[key].stockOut.push(lifting);
      }
    });

    const rows = Object.values(groupedData);

    return (
      <Card className={`border-t-4 ${colorClass}`}>
        <CardContent className="pt-4 pb-3">
          <div className="mb-3">
            <p className={`text-sm font-bold ${textColorClass}`}>{title}</p>
            <p className="text-[10px] text-gray-500">{dateLabel}</p>
          </div>

          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Product</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Depot</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">Company</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Stock In</th>
                  <th className="px-3 py-2 text-center font-semibold text-gray-700">Stock Out</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{row.product}</td>
                    <td className="px-3 py-2 text-gray-700">{row.depot}</td>
                    <td className="px-3 py-2 text-gray-700">{row.company}</td>
                    {/* <td className="px-3 py-2 text-center">
                      {row.stockIn.length > 0 ? (
                        <button className="text-blue-600 hover:underline font-semibold">
                          {row.stockIn.length} ({row.stockIn.reduce((sum, l) => sum + (l.quantity_mt || 0), 0).toFixed(1)} MT)
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td> */}
                    <td className="px-3 py-2 text-center">
                      {row.stockIn.length > 0 ? (
                        <button className="flex flex-col items-center justify-center mx-auto text-blue-600 hover:underline font-semibold leading-tight">
                          {/* Top Line: Count and Truck Icon */}
                          <div className="flex items-center gap-1.5">
                            <span>{row.stockIn.length}</span>
                            <Truck className="w-4 h-4 text-gray-500" />
                          </div>

                          {/* Bottom Line: Total MT */}
                          <span className="text-xs text-gray-600 font-medium mt-0.5">
                            {row.stockIn.reduce((sum, l) => sum + (l.quantity_mt || 0), 0).toFixed(1)} MT
                          </span>
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    {/* <td className="px-3 py-2 text-center">
                      {row.stockOut.length > 0 ? (
                        <button className="text-blue-600 hover:underline font-semibold">
                          {row.stockOut.length} ({row.stockOut.reduce((sum, l) => sum + (l.quantity_mt || 0), 0).toFixed(1)} MT)
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td> */}
                    <td className="px-3 py-2 text-center">
                      {row.stockOut.length > 0 ? (
                        <button className="flex flex-col items-center justify-center mx-auto text-blue-600 hover:underline font-semibold leading-tight">
                          <div className="flex items-center gap-1.5">
                            <span>{row.stockOut.length}</span>
                            <Truck className="w-4 h-4 text-gray-500" />
                          </div>

                          <span className="text-xs text-gray-600 font-medium mt-0.5">
                            {row.stockOut.reduce((sum, l) => sum + (l.quantity_mt || 0), 0).toFixed(1)} MT
                          </span>
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

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
          dateStr={getDateString(0)}
          colorClass="border-t-emerald-500"
          textColorClass="text-emerald-600"
        />
        <DaySummaryCard
          title="YESTERDAY"
          dateLabel={getDateLabel(1)}
          dateStr={getDateString(1)}
          colorClass="border-t-blue-500"
          textColorClass="text-blue-600"
        />
        <DaySummaryCard
          title="DAY BEFORE YESTERDAY"
          dateLabel={getDateLabel(2)}
          dateStr={getDateString(2)}
          colorClass="border-t-purple-500"
          textColorClass="text-purple-600"
        />
      </div>




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
                            <td className="px-4 py-2 font-medium">


                              {(() => {
                                const isPO = lifting.lifting_no?.startsWith("PO");

                                if (isPO) {
                                  return (
                                    /* 📦 If it starts with PO, navigate to Purchase Orders page */
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/purchase-orders?poNumber=${encodeURIComponent(lifting.lifting_no)}`);
                                      }}
                                      className="font-mono text-blue-600 hover:underline text-left text-sm"
                                    >
                                      {lifting.lifting_no}
                                    </button>
                                  );
                                } else {
                                  return (
                                    /* 🛞 Otherwise (e.g. LFT), navigate to Liftings page */
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/liftings?lifting_no=${encodeURIComponent(lifting.lifting_no)}`);
                                      }}
                                      className="font-mono text-blue-600 hover:underline text-left text-sm"
                                    >
                                      {lifting.lifting_no}
                                    </button>
                                  );
                                }
                              })()}

                              {/* <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/liftings?lifting_no=${encodeURIComponent(lifting.lifting_no)}`);
                                }}
                                className="font-mono text-blue-600 hover:underline text-left text-sm"
                              >
                                {lifting.lifting_no || '-'}
                              </button> */}
                            </td>
                            <td className="px-4 py-2">
                              {lifting.lifting_type === 'Primary' && lifting.delivery_order_no ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/delivery-orders?do=${encodeURIComponent(lifting.delivery_order_no)}`);
                                  }}
                                  className="text-[11px] text-blue-500 hover:underline text-left"
                                >
                                  {lifting.delivery_order_no}
                                </button>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-2">
                              {/* <span className={`px-2 py-0.5 rounded text-xs ${lifting.lifting_type === 'Primary'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                                }`}>
                                {lifting.lifting_type}
                              </span> */}



                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${lifting.lifting_type === 'Primary'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                                }`}>
                                {lifting.lifting_type === 'Primary' ? '↓ IN' : '↑ OUT'}
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
                              <span className={`px-2 py-0.5 rounded text-xs ${lifting.unloading_status === 'Verified'
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
