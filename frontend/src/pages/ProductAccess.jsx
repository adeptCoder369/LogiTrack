import { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { productsApi, usersApi, sourceAccessApi } from '../lib/api';
import { toast } from 'sonner';
import { Package, Users, Shield, Search, ChevronDown, ChevronUp, RefreshCw, Building2, CheckSquare, Save } from 'lucide-react';
import { Input } from '../components/ui/input';

// ============================== PRODUCT ACCESS TAB ==============================

function ProductsAccessTab() {
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
    'Weightment': 'bg-green-100 text-green-800',
    'Dispatch Verifier': 'bg-amber-100 text-amber-800',
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex-1">
          <p className="text-sm text-blue-800">
            <strong>Read-only view.</strong> To assign or revoke product access, go to{' '}
            <strong>User Management</strong> and edit the user's product assignments.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData} className="ml-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
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
    </>
  );
}

// ============================== SOURCE ACCESS TAB ==============================

function SourceAccessTab() {
  const [data, setData] = useState(null); // { sources, products }
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState(null);
  const [checked, setChecked] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const load = async () => {
    try {
      const res = await sourceAccessApi.getAll();
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load source access');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEditor = (source) => {
    setSelectedSource(source);
    setChecked(source.product_ids || []);
  };

  const toggleProduct = (id) => {
    setChecked(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await sourceAccessApi.updateSource(selectedSource.source_type, selectedSource.source_id, checked);
      toast.success('Source access updated');
      await load();
      setSelectedSource(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save source access');
    } finally {
      setSaving(false);
    }
  };

  const filteredSources = (data?.sources || []).filter(s =>
    s.source_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.source_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const mappedCount = (data?.sources || []).filter(s => (s.product_ids || []).length > 0).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Source list */}
      <div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Which products can each source supply?</strong> A source with no mappings stays
            visible to everyone; once mapped, it is only visible to users who can access at least one
            of its mapped products.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{(data?.sources || []).length}</p>
                  <p className="text-sm text-gray-500">Total Sources</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <CheckSquare className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{mappedCount}</p>
                  <p className="text-sm text-gray-500">Mapped Sources</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative w-full mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search sources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
          {filteredSources.map((source) => (
            <Card
              key={`${source.source_type}-${source.source_id}`}
              className={`cursor-pointer transition-colors ${selectedSource?.source_id === source.source_id ? 'ring-2 ring-blue-500' : 'hover:bg-gray-50'}`}
              onClick={() => openEditor(source)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${source.source_type === 'Depot' ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'}`}>
                    {source.source_type}
                  </span>
                  <p className="font-medium truncate">{source.source_name}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${(source.product_ids || []).length > 0 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {(source.product_ids || []).length} product{(source.product_ids || []).length === 1 ? '' : 's'}
                </span>
              </CardContent>
            </Card>
          ))}
          {filteredSources.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-slate-400 text-sm">
                No sources found.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Editor */}
      <div>
        {selectedSource ? (
          <Card className="sticky top-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${selectedSource.source_type === 'Depot' ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'}`}>
                      {selectedSource.source_type}
                    </span>
                    {selectedSource.source_name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Select the products this source can supply. Uncheck everything to leave it unrestricted.
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSource(null)}>Close</Button>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {(data?.products || []).map((product) => {
                  const isChecked = checked.includes(product.id);
                  return (
                    <label
                      key={product.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleProduct(product.id)}
                        className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.product_name}</p>
                        {product.product_code && (
                          <p className="text-xs text-gray-500 font-mono">{product.product_code}</p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-xs text-gray-500">
                  {checked.length} product{checked.length === 1 ? '' : 's'} mapped
                </p>
                <Button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Mapping'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-16 text-center text-slate-400">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-sm">Select a source on the left to edit its product mapping.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============================== PAGE ==============================

export default function ProductAccess() {
  return (
    <PageLayout
      title="Product & Source Access"
      subtitle="Control which products users can see, and which products each source can supply"
    >
      <Tabs defaultValue="products">
        <TabsList className="mb-6">
          <TabsTrigger value="products">Product Access</TabsTrigger>
          <TabsTrigger value="sources">Source Access</TabsTrigger>
        </TabsList>
        <TabsContent value="products">
          <ProductsAccessTab />
        </TabsContent>
        <TabsContent value="sources">
          <SourceAccessTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
