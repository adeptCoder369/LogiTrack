import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { productsApi, usersApi } from '../lib/api';
import { toast } from 'sonner';
import { Package, Users, Shield, Search, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Input } from '../components/ui/input';

export default function ProductAccess() {
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProducts, setExpandedProducts] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, usersRes] = await Promise.all([
        productsApi.getAll(),
        usersApi.getAll()
      ]);

      setProducts(productsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleProductExpand = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const getUsersWithProductAccess = (product) => {
    return users.filter(user => {
      // Master admin always has access
      if (user.is_master_admin) return true;
      // Explicitly assigned
      if ((user.assigned_products || []).includes(product.id)) return true;
      // Role-derived access
      if ((product.assigned_roles || []).includes(user.role)) return true;
      return false;
    });
  };

  const getAccessType = (user, product) => {
    if (user.is_master_admin) return 'master';
    if ((user.assigned_products || []).includes(product.id)) return 'explicit';
    if ((product.assigned_roles || []).includes(user.role)) return 'role';
    return null;
  };

  const filteredProducts = products.filter(p =>
    p.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleColors = {
    'Admin': 'bg-red-100 text-red-800',
    'Management': 'bg-slate-100 text-slate-800',
    'Loader': 'bg-blue-100 text-blue-800',
    'Depot Manager': 'bg-green-100 text-green-800',
    'Depot Staff': 'bg-purple-100 text-purple-800',
    'Depot Supervisor': 'bg-orange-100 text-orange-800',
  };

  const totalWithAccess = users.filter(u => {
    if (u.is_master_admin) return true;
    return products.some(p =>
      (u.assigned_products || []).includes(p.id) ||
      (p.assigned_roles || []).includes(u.role)
    );
  }).length;

  if (loading) {
    return (
      <PageLayout title="Product Access" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse text-slate-400">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Product Access"
      subtitle="View which users have access to each product (manage access from User Management)"
      actions={
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      }
    >
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Read-only view.</strong> To assign or revoke product access, go to{' '}
          <strong>User Management</strong> and edit the user's product assignments.
        </p>
      </div>

      <div className="mb-6">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-gray-500">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-sm text-gray-500">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalWithAccess}</p>
                <p className="text-sm text-gray-500">Users with Access</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {filteredProducts.map((product) => {
          const usersWithAccess = getUsersWithProductAccess(product);
          const isExpanded = expandedProducts[product.id];

          return (
            <Card key={product.id} data-testid={`product-card-${product.id}`}>
              <div
                className="cursor-pointer hover:bg-gray-50 transition-colors p-6 border-b"
                onClick={() => toggleProductExpand(product.id)}
                data-testid={`product-header-${product.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <Package className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{product.product_name}</h3>
                      {product.product_code && (
                        <p className="text-sm text-gray-500 font-mono">{product.product_code}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">{usersWithAccess.length}</p>
                      <p className="text-xs text-gray-500">users have access</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <CardContent className="border-t bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {users.map((user) => {
                      const accessType = getAccessType(user, product);
                      const hasAccess = accessType !== null;

                      return (
                        <div
                          key={user.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            hasAccess ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            hasAccess ? 'bg-green-500' : 'bg-gray-300'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.name}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>
                                {user.role}
                              </span>
                              {accessType === 'master' && (
                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">Master</span>
                              )}
                              {accessType === 'role' && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">via role</span>
                              )}
                              {accessType === 'explicit' && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">assigned</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Products Found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try a different search term' : 'Add products first to manage access'}
            </p>
          </CardContent>
        </Card>
      )}
    </PageLayout>
  );
}