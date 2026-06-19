import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { deliveryOrdersApi, liftingsApi, productsApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { usePermissions } from '../lib/permissions';
import { toast } from 'sonner';
import { 
  ClipboardList, Package, TrendingUp, TrendingDown, Truck, Warehouse, 
  BarChart3, ChevronDown, ChevronUp, Building2, Filter, Search, X, Calendar 
} from 'lucide-react';

export default function DOWallet() {
  const { hasPermission } = usePermissions();
  const [orders, setOrders] = useState([]);
  const [liftings, setLiftings] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('by-do');
  const [expandedProducts, setExpandedProducts] = useState({});
  const [filters, setFilters] = useState({
    productId: 'all',
    status: 'all',
    searchTerm: '',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const apiCalls = [
        liftingsApi.getAll({ lifting_type: 'Primary' }),
        productsApi.getAll()
      ];
      
      // Only fetch delivery orders if user has permission
      if (hasPermission('Delivery Orders (View)')) {
        apiCalls.push(deliveryOrdersApi.getAll());
      }
      
      const results = await Promise.all(apiCalls);
      setLiftings(results[0].data);
      setProducts(results[1].data);
      
      if (hasPermission('Delivery Orders (View)')) {
        setOrders(results[2].data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load some data');
    } finally {
      setLoading(false);
    }
  };

  // Group liftings by delivery order and then by depot
  const getLiftingsByDO = (doId) => {
    const doLiftings = liftings.filter(l => l.delivery_order_id === doId);
    
    // Group by unloading depot
    const byDepot = doLiftings.reduce((acc, l) => {
      const depotName = l.unloading_point_name || 'Unknown';
      if (!acc[depotName]) {
        acc[depotName] = {
          name: depotName,
          liftings: [],
          totalQuantity: 0,
          verified: 0,
          pending: 0
        };
      }
      acc[depotName].liftings.push(l);
      acc[depotName].totalQuantity += l.quantity_mt || 0;
      if (l.unloading_status === 'Verified') {
        acc[depotName].verified += l.quantity_mt || 0;
      } else {
        acc[depotName].pending += l.quantity_mt || 0;
      }
      return acc;
    }, {});
    
    return {
      total: doLiftings.reduce((sum, l) => sum + (l.quantity_mt || 0), 0),
      byDepot: Object.values(byDepot),
      count: doLiftings.length
    };
  };

  // Get product-wise summary across all DOs
  const getProductWiseSummary = () => {
    const productSummary = {};
    
    // Summarize from delivery orders
    orders.forEach(order => {
      const productName = order.product_name || 'Unknown Product';
      const productId = order.product_id || productName;
      
      if (!productSummary[productId]) {
        productSummary[productId] = {
          productName,
          productCode: order.product_code || '',
          totalOrdered: 0,
          totalLifted: 0,
          totalRemaining: 0,
          deliveryOrders: [],
          depotWise: {}
        };
      }
      productSummary[productId].totalOrdered += order.total_quantity_mt || 0;
      productSummary[productId].totalLifted += order.lifted_quantity_mt || 0;
      productSummary[productId].totalRemaining += order.remaining_quantity_mt || 0;
      productSummary[productId].deliveryOrders.push(order);
    });
    
    // Add depot-wise distribution from liftings
    liftings.forEach(lifting => {
      const productId = lifting.product_id || lifting.product_name || 'Unknown';
      const depotName = lifting.unloading_point_name || 'Unknown Depot';
      
      if (productSummary[productId]) {
        if (!productSummary[productId].depotWise[depotName]) {
          productSummary[productId].depotWise[depotName] = {
            name: depotName,
            quantity: 0,
            verified: 0,
            pending: 0,
            liftings: 0
          };
        }
        productSummary[productId].depotWise[depotName].quantity += lifting.quantity_mt || 0;
        productSummary[productId].depotWise[depotName].liftings += 1;
        if (lifting.unloading_status === 'Verified') {
          productSummary[productId].depotWise[depotName].verified += lifting.quantity_mt || 0;
        } else {
          productSummary[productId].depotWise[depotName].pending += lifting.quantity_mt || 0;
        }
      }
    });
    
    return Object.values(productSummary);
  };

  const toggleProductExpand = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  if (loading) {
    return (
      <PageLayout title="DO Wallet" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  const productSummary = getProductWiseSummary();

  // Filter orders by date as well
  const filteredOrders = orders.filter(order => {
    if (filters.productId !== 'all' && order.product_id !== filters.productId) return false;
    if (filters.status !== 'all' && order.status !== filters.status) return false;
    if (filters.dateFrom) {
      const orderDate = (order.do_date || order.created_at || '').substring(0, 10);
      if (orderDate < filters.dateFrom) return false;
    }
    if (filters.dateTo) {
      const orderDate = (order.do_date || order.created_at || '').substring(0, 10);
      if (orderDate > filters.dateTo) return false;
    }
    if (filters.searchTerm) {
      const search = filters.searchTerm.toLowerCase();
      return (
        order.do_order_no?.toLowerCase().includes(search) ||
        order.product_name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // Filter product summary
  const filteredProductSummary = filters.productId !== 'all' 
    ? productSummary.filter(p => p.productId === filters.productId)
    : productSummary;

  const clearFilters = () => {
    setFilters({ productId: 'all', status: 'all', searchTerm: '', dateFrom: '', dateTo: '' });
  };

  const hasActiveFilters = filters.productId !== 'all' || filters.status !== 'all' || 
                           filters.searchTerm || filters.dateFrom || filters.dateTo;

  return (
    <PageLayout
      title="Delivery Order Wallet"
      subtitle="Real-time quantity tracking per Delivery Order"
    >
      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Filters:</span>
            </div>
            <div className="flex items-center gap-2 min-w-[180px]">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search DO#, product..."
                value={filters.searchTerm}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                className="h-9"
              />
            </div>
            <Select value={filters.productId} onValueChange={(v) => setFilters({ ...filters, productId: v })}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.product_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-36 h-9"
                placeholder="From"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-36 h-9"
                placeholder="To"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-600">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-t-4 border-orange-500">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-gray-500">Total DOs</p>
                <p className="text-2xl font-bold">{filteredOrders.length}</p>
                {hasActiveFilters && <p className="text-xs text-gray-400">of {orders.length}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Total Ordered</p>
                <p className="text-2xl font-bold">
                  {filteredOrders.reduce((sum, o) => sum + (o.total_quantity_mt || 0), 0).toFixed(2)} MT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Total Lifted</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredOrders.reduce((sum, o) => sum + (o.lifted_quantity_mt || 0), 0).toFixed(2)} MT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <TrendingDown className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-gray-500">Remaining</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {filteredOrders.reduce((sum, o) => sum + (o.remaining_quantity_mt || 0), 0).toFixed(2)} MT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="by-do" className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            By Delivery Order
          </TabsTrigger>
          <TabsTrigger value="by-product" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            By Product
          </TabsTrigger>
        </TabsList>

        {/* By Delivery Order Tab */}
        <TabsContent value="by-do" className="mt-6">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Delivery Orders</h3>
                <p className="text-gray-500">{hasActiveFilters ? 'No orders match your filters.' : 'Create a delivery order to start tracking.'}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => {
                const liftingData = getLiftingsByDO(order.id);
                const progress = order.total_quantity_mt > 0 
                  ? ((order.lifted_quantity_mt || 0) / order.total_quantity_mt) * 100 
                  : 0;
                
                return (
                  <Card key={order.id}>
                    <CardHeader className="border-b bg-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-100 rounded-lg">
                            <ClipboardList className="w-6 h-6 text-orange-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg mono">{order.do_order_no}</CardTitle>
                            <p className="text-sm text-gray-500">
                              {order.product_name} | From: {order.from_company_name || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                            order.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Lifting Progress</span>
                          <span className="font-medium">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Quantity Summary */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-blue-50 rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">Total Ordered</p>
                          <p className="text-xl font-bold text-blue-600">{order.total_quantity_mt} MT</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">Lifted</p>
                          <p className="text-xl font-bold text-green-600">{order.lifted_quantity_mt || 0} MT</p>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">Remaining</p>
                          <p className="text-xl font-bold text-yellow-600">{order.remaining_quantity_mt || 0} MT</p>
                        </div>
                      </div>

                      {/* Distribution by Depot */}
                      {liftingData.byDepot.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <Warehouse className="w-4 h-4" />
                            Distribution by Depot ({liftingData.count} liftings)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {liftingData.byDepot.map((depot, idx) => (
                              <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                                <div className="flex items-center gap-2 mb-2">
                                  <Warehouse className="w-4 h-4 text-slate-500" />
                                  <span className="font-medium text-sm">{depot.name}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-gray-500">Total:</span>
                                    <span className="font-medium ml-1">{depot.totalQuantity.toFixed(2)} MT</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Trucks:</span>
                                    <span className="font-medium ml-1">{depot.liftings.length}</span>
                                  </div>
                                  <div>
                                    <span className="text-green-600">Verified:</span>
                                    <span className="font-medium ml-1">{depot.verified.toFixed(2)} MT</span>
                                  </div>
                                  <div>
                                    <span className="text-yellow-600">Pending:</span>
                                    <span className="font-medium ml-1">{depot.pending.toFixed(2)} MT</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {liftingData.byDepot.length === 0 && (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          No liftings created yet for this DO
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* By Product Tab */}
        <TabsContent value="by-product" className="mt-6">
          {productSummary.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No Products Found</h3>
                <p className="text-gray-500">No delivery orders with products found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {productSummary.map((product, idx) => {
                const isExpanded = expandedProducts[product.productName];
                const progress = product.totalOrdered > 0 
                  ? (product.totalLifted / product.totalOrdered) * 100 
                  : 0;
                const depots = Object.values(product.depotWise);
                
                return (
                  <Card key={idx}>
                    <CardHeader 
                      className="border-b bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer"
                      onClick={() => toggleProductExpand(product.productName)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <Package className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{product.productName}</CardTitle>
                            <p className="text-sm text-gray-500">
                              {product.productCode && <span className="mono mr-2">{product.productCode}</span>}
                              {product.deliveryOrders.length} Delivery Order(s)
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Progress</p>
                            <p className="font-bold text-lg">{progress.toFixed(1)}%</p>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-6">
                      {/* Product Summary */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-blue-50 rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">Total Ordered</p>
                          <p className="text-xl font-bold text-blue-600">{product.totalOrdered.toFixed(2)} MT</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">Total Lifted</p>
                          <p className="text-xl font-bold text-green-600">{product.totalLifted.toFixed(2)} MT</p>
                        </div>
                        <div className="p-4 bg-yellow-50 rounded-lg text-center">
                          <p className="text-xs text-gray-500 mb-1">Remaining</p>
                          <p className="text-xl font-bold text-yellow-600">{product.totalRemaining.toFixed(2)} MT</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-6">
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t pt-4 mt-4">
                          {/* Depot Distribution */}
                          {depots.length > 0 && (
                            <div className="mb-6">
                              <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <Warehouse className="w-4 h-4" />
                                Distribution by Depot
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {depots.map((depot, dIdx) => (
                                  <div key={dIdx} className="p-3 border rounded-lg bg-gray-50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Warehouse className="w-4 h-4 text-slate-500" />
                                      <span className="font-medium text-sm">{depot.name}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div>
                                        <span className="text-gray-500">Quantity:</span>
                                        <span className="font-medium ml-1">{depot.quantity.toFixed(2)} MT</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-500">Liftings:</span>
                                        <span className="font-medium ml-1">{depot.liftings}</span>
                                      </div>
                                      <div>
                                        <span className="text-green-600">Verified:</span>
                                        <span className="font-medium ml-1">{depot.verified.toFixed(2)} MT</span>
                                      </div>
                                      <div>
                                        <span className="text-yellow-600">Pending:</span>
                                        <span className="font-medium ml-1">{depot.pending.toFixed(2)} MT</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Related DOs */}
                          <div>
                            <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                              <ClipboardList className="w-4 h-4" />
                              Related Delivery Orders
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b bg-gray-50">
                                    <th className="text-left px-3 py-2">DO Number</th>
                                    <th className="text-left px-3 py-2">From Company</th>
                                    <th className="text-right px-3 py-2">Total</th>
                                    <th className="text-right px-3 py-2">Lifted</th>
                                    <th className="text-right px-3 py-2">Remaining</th>
                                    <th className="text-center px-3 py-2">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {product.deliveryOrders.map((do_item, doIdx) => (
                                    <tr key={doIdx} className="border-b">
                                      <td className="px-3 py-2 mono font-medium">{do_item.do_order_no}</td>
                                      <td className="px-3 py-2">{do_item.from_company_name || '-'}</td>
                                      <td className="px-3 py-2 text-right">{do_item.total_quantity_mt} MT</td>
                                      <td className="px-3 py-2 text-right text-green-600">{do_item.lifted_quantity_mt || 0} MT</td>
                                      <td className="px-3 py-2 text-right text-yellow-600">{do_item.remaining_quantity_mt || 0} MT</td>
                                      <td className="px-3 py-2 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                          do_item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                          do_item.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                          'bg-yellow-100 text-yellow-800'
                                        }`}>
                                          {do_item.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
