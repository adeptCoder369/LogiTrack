import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { analyticsApi, deliveryOrdersApi, tenantApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';

const COLORS = ['#0F172A', '#F97316', '#3B82F6', '#10B981', '#64748B', '#EAB308', '#EF4444'];

export default function Analytics() {
  const { user } = useAuth();
  const isMaster = !!user?.is_master_admin;
  const [period, setPeriod] = useState('monthly');
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('all');

  useEffect(() => {
    if (isMaster) {
      tenantApi.getAll().then(res => setTenants(res.data || [])).catch(() => {});
    }
  }, [isMaster]);

  useEffect(() => {
    fetchData();
  }, [period, selectedTenant]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tenantId = isMaster && selectedTenant !== 'all' ? selectedTenant : undefined;
      const [analyticsRes, ordersRes] = await Promise.all([
        analyticsApi.getDashboard(tenantId),
        deliveryOrdersApi.getAll(undefined, tenantId)
      ]);
      setAnalytics(analyticsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process orders for trend data
  const getOrderTrendData = () => {
    const grouped = {};
    orders.forEach(order => {
      if (order.do_date) {
        const date = new Date(order.do_date);
        let key;
        if (period === 'weekly') {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (period === 'monthly') {
          key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        } else if (period === 'quarterly') {
          const quarter = Math.ceil((date.getMonth() + 1) / 3);
          key = `Q${quarter} ${date.getFullYear()}`;
        } else {
          key = date.getFullYear().toString();
        }
        
        if (!grouped[key]) {
          grouped[key] = { name: key, orders: 0, quantity: 0 };
        }
        grouped[key].orders += 1;
        grouped[key].quantity += order.total_quantity_mt || order.quantity_mt || 0;
      }
    });
    return Object.values(grouped).slice(-12);
  };

  // Product distribution
  const getProductDistribution = () => {
    const grouped = {};
    orders.forEach(order => {
      const product = order.product_name || 'Unknown';
      if (!grouped[product]) {
        grouped[product] = { name: product, value: 0 };
      }
      grouped[product].value += order.total_quantity_mt || order.quantity_mt || 0;
    });
    return Object.values(grouped).filter(p => p.value > 0);
  };

  // Status distribution - backend: open/in_progress/completed, frontend labels Pending/In Transit/Delivered
  const getStatusDistribution = () => {
    const obs = analytics?.orders_by_status || {};
    let vals = [
      { name: 'Pending', value: obs.pending ?? obs.open ?? 0 },
      { name: 'In Transit', value: obs.in_transit ?? obs.in_progress ?? 0 },
      { name: 'Delivered', value: obs.delivered ?? obs.completed ?? 0 },
    ].filter(s => s.value > 0);
    // fallback to counting orders directly if analytics returns 0 (company_id filter mismatch for Management)
    if (vals.length === 0 && orders.length > 0) {
      const counts = { Pending: 0, 'In Transit': 0, Delivered: 0 };
      orders.forEach(o => {
        if (o.status === 'Open') counts.Pending += 1;
        else if (o.status === 'In Progress') counts['In Transit'] += 1;
        else if (o.status === 'Completed' || o.status === 'Delivered') counts.Delivered += 1;
      });
      vals = Object.entries(counts).map(([name, value]) => ({ name, value })).filter(s => s.value > 0);
    }
    return vals;
  };

  const orderTrendData = getOrderTrendData();
  const productDistribution = getProductDistribution();
  const statusDistribution = getStatusDistribution();

  if (loading) {
    return (
      <PageLayout title="Analytics" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-400">Loading analytics...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Analytics"
      subtitle="Detailed insights and reports"
      actions={
        <div className="flex gap-3">
          {isMaster && (
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All workspaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workspaces (collectively)</SelectItem>
                {tenants.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.slug})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={period} onValueChange={setPeriod} data-testid="period-select">
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-t-4 border-orange-500">
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              {orders.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Total Quantity</p>
            <p className="text-3xl font-bold text-slate-900" style={{ fontFamily: 'Manrope' }}>
              {orders.reduce((sum, o) => sum + (o.total_quantity_mt || o.quantity_mt || 0), 0).toFixed(2)} MT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Delivered</p>
            <p className="text-3xl font-bold text-green-600" style={{ fontFamily: 'Manrope' }}>
              {orders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">In Transit</p>
            <p className="text-3xl font-bold text-blue-600" style={{ fontFamily: 'Manrope' }}>
              {orders.filter(o => o.status === 'In Progress' || o.status === 'In Transit').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Order Trend */}
        <Card>
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
              Order Trend ({period})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {orderTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={orderTrendData}>
                  <defs>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#F97316"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorOrders)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No order data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quantity Trend */}
        <Card>
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
              Quantity Trend (MT)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {orderTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={orderTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                    formatter={(value) => [`${value.toFixed(2)} MT`, 'Quantity']}
                  />
                  <Bar dataKey="quantity" fill="#0F172A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No quantity data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product Distribution */}
        <Card>
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
              Product Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {productDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={productDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {productDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value.toFixed(2)} MT`, 'Quantity']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No product data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-lg" style={{ fontFamily: 'Manrope' }}>
              Order Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.name === 'Delivered' ? '#10B981' :
                          entry.name === 'In Transit' ? '#3B82F6' :
                          '#EAB308'
                        } 
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                No status data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
