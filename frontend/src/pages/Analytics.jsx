import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { analyticsApi, deliveryOrdersApi } from '../lib/api';
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
  const [period, setPeriod] = useState('monthly');
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, ordersRes] = await Promise.all([
        analyticsApi.getDashboard(),
        deliveryOrdersApi.getAll()
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
        grouped[key].quantity += order.quantity_mt || 0;
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
      grouped[product].value += order.quantity_mt || 0;
    });
    return Object.values(grouped).filter(p => p.value > 0);
  };

  // Status distribution
  const getStatusDistribution = () => {
    return [
      { name: 'Pending', value: analytics?.orders_by_status.pending || 0 },
      { name: 'In Transit', value: analytics?.orders_by_status.in_transit || 0 },
      { name: 'Delivered', value: analytics?.orders_by_status.delivered || 0 },
    ].filter(s => s.value > 0);
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
              {orders.reduce((sum, o) => sum + (o.quantity_mt || 0), 0).toFixed(2)} MT
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Delivered</p>
            <p className="text-3xl font-bold text-green-600" style={{ fontFamily: 'Manrope' }}>
              {orders.filter(o => o.status === 'Delivered').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">In Transit</p>
            <p className="text-3xl font-bold text-blue-600" style={{ fontFamily: 'Manrope' }}>
              {orders.filter(o => o.status === 'In Transit').length}
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
