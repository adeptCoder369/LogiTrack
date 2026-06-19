import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { depotInventoryApi, depotsApi, productsApi, liftingsApi, pickupApi } from '../lib/api';
import { toast } from 'sonner';
import { Warehouse, Package, ArrowDownToLine, ArrowUpFromLine, RefreshCw, Download, ChevronDown, ChevronUp, Filter, Truck, Train, Calendar, X, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../lib/permissions';

export default function InventoryWallet() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canView = hasPermission('Inventory Wallet (View)');
  const [inventory, setInventory] = useState([]);
  const [liftings, setLiftings] = useState([]);
  const [depots, setDepots] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedDepot, setSelectedDepot] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});
  const [ledgerData, setLedgerData] = useState({});
  const [loadingLedger, setLoadingLedger] = useState({});
  console.log(liftings)
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inventoryRes, depotsRes, productsRes, liftingsRes, pickupsRes] = await Promise.all([
        depotInventoryApi.getAll(),
        depotsApi.getAll(),
        productsApi.getAll(),
        liftingsApi.getAll({ page_size: 500 }),
        pickupApi.getAll({ status: 'verified,weightment_done,final_verified', page_size: 500 })
      ]);
      console.log('inventoryRes ===', inventoryRes, depotsRes, productsRes, liftingsRes, pickupsRes)
      setInventory(inventoryRes.data);
      setDepots(depotsRes.data);
      setProducts(productsRes.data);

      const rawLiftings = liftingsRes.data || [];
      const pickups = pickupsRes.data || [];

      // Convert pickups into lifting-like records so reports and wallet count them as stock-out
      const pickupAsLiftings = pickups.map(p => ({
        id: `pickup-${p.id}`,
        lifting_type: 'Pickup',
        transport_mode: 'Road',
        company_id: p.company_id || null,
        delivery_order_id: p.purchase_order_id || null,
        delivery_order_no: p.purchase_order_no || null,
        product_id: p.product_id || null,
        product_name: p.product_name || null,
        product_code: p.product_code || null,
        quantity_mt: p.weight_mt || 0,
        loading_point_type: 'Depot',
        loading_point_id: p.depot_id || null,
        loading_point_name: p.depot_name || null,
        date_of_loading: p.verified_at || p.date || null,
        vehicle_number: p.truck_number || null,
        unloading_point_type: 'Company',
        unloading_point_id: p.purchase_order_company_id || p.company_id || null,
        unloading_point_name: p.purchase_order_company_name || p.company_name || null,
        unloading_status: 'Verified',
        lifting_no: p.purchase_order_no || p.id
      }));

      // Merge liftings + pickup-as-liftings
      const merged = [...rawLiftings, ...pickupAsLiftings];
      setLiftings(merged);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };
  const toggleExpand = async (itemId, depotId, productId) => {
    const isExpanded = expandedItems[itemId];

    // Always refetch if date filters change or first time expanding
    const shouldFetch = !isExpanded && (!ledgerData[itemId] || dateFrom || dateTo);

    if (shouldFetch) {
      // Fetch ledger data with date filters
      setLoadingLedger(prev => ({ ...prev, [itemId]: true }));
      try {
        const response = await depotInventoryApi.getLedger(depotId, productId, dateFrom, dateTo);
        setLedgerData(prev => ({ ...prev, [itemId]: response.data }));
      } catch (error) {
        toast.error('Failed to load transaction history');
      } finally {
        setLoadingLedger(prev => ({ ...prev, [itemId]: false }));
      }
    }

    setExpandedItems(prev => ({ ...prev, [itemId]: !isExpanded }));
  };
  // console.log('LedgerData', ledgerData)
  // Clear ledger cache when date filters change
  useEffect(() => {
    setLedgerData({});
    setExpandedItems({});
  }, [dateFrom, dateTo]);

  // Filter inventory
  let filteredInventory = inventory;
  if (selectedDepot !== 'all') {
    filteredInventory = filteredInventory.filter(i => i.depot_id === selectedDepot);
  }
  if (selectedProduct !== 'all') {
    filteredInventory = filteredInventory.filter(i => i.product_id === selectedProduct);
  }

  // Group by depot
  const groupedByDepot = filteredInventory.reduce((acc, item) => {
    const depotId = item.depot_id;
    if (!acc[depotId]) {
      acc[depotId] = {
        depot_name: item.depot_name,
        items: []
      };
    }
    acc[depotId].items.push(item);
    return acc;
  }, {});

  const primaryDepotInLiftings = liftings.filter(l => l.lifting_type === 'Primary' && l.unloading_point_type === 'Depot');
  const secondaryDepotOutLiftings = liftings.filter(l => (l.lifting_type === 'Secondary' || l.lifting_type === 'Pickup') && l.loading_point_type === 'Depot');

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <PageLayout title="Inventory Wallet" subtitle="Real-time stock tracking">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  if (!canView) {
    return (
      <PageLayout title="Inventory Wallet">
        <div className="p-8 text-center text-gray-500">You do not have permission to view inventory.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Inventory Wallet"
      subtitle="Real-time stock levels at each depot"
      actions={
        <div className="flex gap-3 items-center">
          <button
            onClick={fetchData}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      }
    >
      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total Inventory */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Total Available Stock</p>
                <p className="text-3xl font-bold text-emerald-600" style={{ fontFamily: 'Manrope' }}>
                  {filteredInventory.reduce((sum, i) => sum + (i.available_quantity || 0), 0).toFixed(2)}
                  <span className="text-sm font-normal text-gray-400 ml-1">MT</span>
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Warehouse className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* In/Out Summary */}
            <div className="border-t pt-3 mt-2">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-green-50 rounded px-2 py-1.5">
                  <span className="text-gray-500">Total Received: </span>
                  <span className="font-semibold text-green-700">
                    {filteredInventory.reduce((sum, i) => sum + (i.total_received || 0), 0).toFixed(2)} MT
                  </span>
                </div>
                <div className="bg-red-50 rounded px-2 py-1.5">
                  <span className="text-gray-500">Total Dispatched: </span>
                  <span className="font-semibold text-red-700">
                    {filteredInventory.reduce((sum, i) => sum + (i.total_dispatched || 0), 0).toFixed(2)} MT
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Primary Liftings IN (Company → Depot) */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Stock In (Primary)</p>
                <p className="text-3xl font-bold text-blue-600" style={{ fontFamily: 'Manrope' }}>
                  {primaryDepotInLiftings.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <ArrowDownToLine className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Primary IN Breakdown */}
            <div className="border-t pt-3 mt-2">
              <p className="text-[10px] font-semibold text-blue-600 mb-1">Primary: Company → Depot</p>
              <div className="bg-blue-50 rounded px-2 py-1.5 text-[10px]">
                <span className="text-gray-500">Received: </span>
                <span className="font-semibold text-blue-700">
                  {primaryDepotInLiftings.reduce((sum, l) => sum + (l.quantity_mt || 0), 0).toFixed(2)} MT
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Liftings OUT */}
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Stock Out (Secondary)</p>
                <p className="text-3xl font-bold text-purple-600" style={{ fontFamily: 'Manrope' }}>
                  {secondaryDepotOutLiftings.length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <ArrowUpFromLine className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Secondary OUT Breakdown */}
            <div className="border-t pt-3 mt-2">
              <p className="text-[10px] font-semibold text-purple-600 mb-1">Secondary Dispatches from Depot</p>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <div className="bg-purple-50 rounded px-2 py-1">
                  <span className="text-gray-500">→Client: </span>
                  <span className="font-semibold text-purple-700">
                    {secondaryDepotOutLiftings.filter(l => l.unloading_point_type === 'Company').reduce((sum, l) => sum + (l.quantity_mt || 0), 0).toFixed(2)} MT
                  </span>
                </div>
                <div className="bg-indigo-50 rounded px-2 py-1">
                  <span className="text-gray-500">→Depot: </span>
                  <span className="font-semibold text-indigo-700">
                    {secondaryDepotOutLiftings.filter(l => l.unloading_point_type === 'Depot').reduce((sum, l) => sum + (l.quantity_mt || 0), 0).toFixed(2)} MT
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Filters:</span>
            </div>
            <Select value={selectedDepot} onValueChange={setSelectedDepot}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select depot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depots</SelectItem>
                {depots.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-36 h-9"
                placeholder="From Date"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-36 h-9"
                placeholder="To Date"
              />
            </div>
            {(selectedDepot !== 'all' || selectedProduct !== 'all' || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedDepot('all'); setSelectedProduct('all'); setDateFrom(''); setDateTo(''); }}
                className="text-orange-600"
              >
                <X className="w-4 h-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {Object.keys(groupedByDepot).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Warehouse className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Inventory Data</h3>
            <p className="text-gray-500">
              Inventory will appear here once liftings are verified.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDepot).map(([depotId, depotData]) => (
            <Card key={depotId}>
              <CardHeader className="border-b bg-slate-900 text-white rounded-t-lg">
                <div className="flex items-center gap-3">
                  <Warehouse className="w-6 h-6" />
                  <CardTitle className="text-lg">{depotData.depot_name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {depotData.items.map((item) => (
                    <div key={item.id} className="transition-colors">
                      {/* Main Row */}
                      <div
                        className="p-4 hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleExpand(item.id, item.depot_id, item.product_id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-100 rounded-lg">
                              <Package className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-900">{item.product_name}</h4>
                              {item.product_code && (
                                <p className="text-sm text-gray-500 mono">{item.product_code}</p>
                              )}
                            </div>
                          </div>

                          {/* Stock Level - Highlighted Card */}
                          <div className="flex items-center gap-4">
                            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-center shadow-sm">
                              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1">Available Stock</p>
                              <p className="text-3xl font-bold text-green-700" style={{ fontFamily: 'Manrope' }}>
                                {item.available_quantity?.toFixed(2)} <span className="text-lg font-medium text-green-500">MT</span>
                              </p>
                            </div>
                            <div className="p-2 hover:bg-gray-200 rounded-lg">
                              {expandedItems[item.id] ? (
                                <ChevronUp className="w-5 h-5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-500" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
                          <div className="flex items-center gap-2">
                            <ArrowDownToLine className="w-4 h-4 text-green-500" />
                            <div>
                              <p className="text-xs text-gray-500">Total Received</p>
                              <p className="font-medium text-green-600">{item.total_received?.toFixed(2)} MT</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowUpFromLine className="w-4 h-4 text-red-500" />
                            <div>
                              <p className="text-xs text-gray-500">Total Dispatched</p>
                              <p className="font-medium text-red-600">{item.total_dispatched?.toFixed(2)} MT</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Last Updated</p>
                            <p className="text-sm text-gray-600">
                              {item.last_updated ? new Date(item.last_updated).toLocaleString() : '-'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Ledger (Expanded View) */}
                      {expandedItems[item.id] && (
                        <div className="bg-slate-50 border-t">
                          <div className="p-4">
                            <h5 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              Transaction Ledger
                            </h5>

                            {loadingLedger[item.id] ? (
                              <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-sm text-gray-500 mt-2">Loading transactions...</p>
                              </div>
                            ) : ledgerData[item.id]?.transactions?.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-slate-200">
                                      <th className="px-3 py-2 text-left font-medium text-slate-600">Date</th>
                                      <th className="px-3 py-2 text-left font-medium text-slate-600">Type</th>
                                      <th className="px-3 py-2 text-left font-medium text-slate-600">Lifting No</th>
                                      <th className="px-3 py-2 text-left font-medium text-slate-600">Mode</th>
                                      <th className="px-3 py-2 text-left font-medium text-slate-600">From/To</th>
                                      <th className="px-3 py-2 text-left font-medium text-slate-600">Vehicle</th>
                                      <th className="px-3 py-2 text-right font-medium text-slate-600">In (MT)</th>
                                      <th className="px-3 py-2 text-right font-medium text-slate-600">Out (MT)</th>
                                      <th className="px-3 py-2 text-right font-medium text-slate-600">Balance (MT)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ledgerData[item.id].transactions.map((txn, idx) => {
                                      // console.log('xn------', txn)

                                      return (

                                        <tr key={idx} className="border-b hover:bg-slate-100">
                                          <td className="px-3 py-2 text-gray-600">{formatDate(txn.date)}</td>
                                          <td className="px-3 py-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${txn.type === 'IN'
                                              ? 'bg-green-100 text-green-700'
                                              : 'bg-red-100 text-red-700'
                                              }`}>
                                              {txn.type === 'IN' ? '↓ IN' : '↑ OUT'}
                                            </span>
                                          </td>


                                          {/* <td className="px-3 py-2">
                                            <div>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate(`/liftings?lifting_no=${encodeURIComponent(txn.lifting_no)}`);
                                                }}
                                                className="font-mono text-blue-600 hover:underline text-left"
                                              >
                                                {txn.lifting_no}
                                              </button>

                                              {txn.purchase_order_no ? (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/purchase-orders?poNumber=${encodeURIComponent(txn.purchase_order_no)}`);
                                                  }}
                                                  className="text-[11px] text-blue-500 hover:underline"
                                                >
                                                  PO: {txn.purchase_order_no}
                                                </button>
                                              ) : txn.delivery_order_no && txn.type === 'IN' ? (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/delivery-orders?do=${encodeURIComponent(txn.delivery_order_no)}`);
                                                  }}
                                                  className="text-[11px] text-blue-500 hover:underline"
                                                >
                                                  DO: {txn.delivery_order_no}
                                                </button>
                                              ) : null}
                                            </div>
                                          </td> */}


                                          {/* <td className="px-3 py-2">
                                            <div>
                                              <p className="font-mono text-blue-600">{txn.lifting_no}</p>

                                              {txn.delivery_order_no && txn.type === 'IN' && (
                                                <p className="text-[11px] text-blue-500">
                                                  DO: {txn.delivery_order_no}
                                                </p>
                                              )}
                                            </div>
                                          </td> */}
                                          <td className="px-3 py-2">
                                            <div className="flex flex-col gap-0.5">

                                              {(() => {
                                                const isPO = txn.lifting_no?.startsWith("PO");

                                                if (isPO) {
                                                  return (
                                                    /* 📦 If it starts with PO, navigate to Purchase Orders page */
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/purchase-orders?poNumber=${encodeURIComponent(txn.lifting_no)}`);
                                                      }}
                                                      className="font-mono text-blue-600 hover:underline text-left text-sm"
                                                    >
                                                      {txn.lifting_no}
                                                    </button>
                                                  );
                                                } else {
                                                  return (
                                                    /* 🛞 Otherwise (e.g. LFT), navigate to Liftings page */
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/liftings?lifting_no=${encodeURIComponent(txn.lifting_no)}`);
                                                      }}
                                                      className="font-mono text-blue-600 hover:underline text-left text-sm"
                                                    >
                                                      {txn.lifting_no}
                                                    </button>
                                                  );
                                                }
                                              })()}

                                              {/* 📄 Delivery Order fallback if type is IN and delivery number exists elsewhere */}
                                              {txn.delivery_order_no && txn.type === 'IN' && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/delivery-orders?do_no=${encodeURIComponent(txn.delivery_order_no)}`);
                                                  }}
                                                  className="text-[11px] text-blue-500 hover:underline text-left"
                                                >
                                                  DO: {txn.delivery_order_no}
                                                </button>
                                              )}

                                            </div>
                                          </td>


                                          <td className="px-3 py-2">
                                            <span className="flex items-center gap-1">
                                              {txn.transport_mode === 'Railway' ? (
                                                <Train className="w-3 h-3 text-purple-600" />
                                              ) : (
                                                <Truck className="w-3 h-3 text-slate-600" />
                                              )}
                                              {txn.transport_mode}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2">{txn.type === 'IN' ? txn.from : txn.to}</td>
                                          <td className="px-3 py-2 font-mono text-xs">{txn.vehicle || '-'}</td>
                                          <td className="px-3 py-2 text-right font-medium text-green-600">
                                            {txn.type === 'IN' ? txn.quantity?.toFixed(2) : '-'}
                                          </td>
                                          <td className="px-3 py-2 text-right font-medium text-red-600">
                                            {txn.type === 'OUT' ? txn.quantity?.toFixed(2) : '-'}
                                          </td>
                                          <td className="px-3 py-2 text-right font-bold">{txn.balance?.toFixed(2)}</td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-slate-200 font-semibold">
                                      <td colSpan="6" className="px-3 py-2 text-right">Totals:</td>
                                      <td className="px-3 py-2 text-right text-green-700">
                                        {ledgerData[item.id].total_in?.toFixed(2)}
                                      </td>
                                      <td className="px-3 py-2 text-right text-red-700">
                                        {ledgerData[item.id].total_out?.toFixed(2)}
                                      </td>
                                      <td className="px-3 py-2 text-right text-blue-700">
                                        {ledgerData[item.id].current_balance?.toFixed(2)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No transactions found</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
