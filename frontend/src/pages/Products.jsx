import { useState, useEffect, useRef } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { FormModal } from '../components/shared/FormModal';
import { DeleteDialog } from '../components/shared/DeleteDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { productsApi, importApi, usersApi, companiesApi, productManagementApi, tenantApi } from '../lib/api';
import { useAuth } from '../lib/auth';
import { toast } from 'sonner';
import { Plus, Upload, Download, Save, Trash2, Building2, BadgeIndianRupee } from 'lucide-react';
import { ProductsDataTable } from '@/components/products/DataTable';
import { Checkbox } from '../components/ui/checkbox';
import { Can } from '../components/Can';
import { usePermissions } from '../lib/permissions';

// ============================== CATALOG TAB ==============================

function CatalogTab() {
  const { hasActionPermission } = usePermissions();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    product_name: '',
    product_code: '',
    product_description: '',
    unit_of_measurement: 'MT',
    category: '',
    hsn_code: '',
    current_stock_level: '',
    reorder_level: '',
    storage_requirements: '',
    handling_instructions: '',
    assigned_roles: ['Management'],
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await productsApi.getAll();
      setProducts(res.data);
      try {
        const usersRes = await usersApi.getAll();
        setUsers(usersRes.data || []);
      } catch (e) {
        // ignore user load errors, product CRUD still works
      }
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setFormData({
      product_name: '',
      product_code: '',
      product_description: '',
      unit_of_measurement: 'MT',
      category: '',
      hsn_code: '',
      current_stock_level: '',
      reorder_level: '',
      storage_requirements: '',
      handling_instructions: '',
      assigned_roles: ['Management'],
    });
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      product_name: item.product_name || '',
      product_code: item.product_code || '',
      product_description: item.product_description || '',
      unit_of_measurement: item.unit_of_measurement || 'MT',
      category: item.category || '',
      hsn_code: item.hsn_code || '',
      current_stock_level: item.current_stock_level || '',
      reorder_level: item.reorder_level || '',
      storage_requirements: item.storage_requirements || '',
      handling_instructions: item.handling_instructions || '',
      assigned_roles: [...new Set([...item.assigned_roles || [], 'Management'])],
    });
    setModalOpen(true);
  };

  const handleDelete = (item) => {
    setSelectedItem(item);
    setDeleteOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.product_name) {
      toast.error('Product name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        assigned_roles: [...new Set([...formData.assigned_roles, 'Management'])],
      };
      if (selectedItem) {
        await productsApi.update(selectedItem.id, payload);
        toast.success('Product updated successfully');
      } else {
        await productsApi.create(payload);
        toast.success('Product created successfully');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    setSaving(true);
    try {
      await productsApi.delete(selectedItem.id);
      toast.success('Product deleted successfully');
      setDeleteOpen(false);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const url = importApi.getTemplate('products');
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const result = await importApi.bulkImport('products', file);
      const { imported, errors, total_errors } = result.data || {};
      toast.success(`Imported ${imported || 0} products${total_errors ? ` (${total_errors} errors)` : ''}`);
      if (total_errors) {
        console.warn('Import errors:', errors);
      }
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const categoryOptions = ['Cement', 'Steel', 'Iron Ore', 'Coal', 'Limestone', 'Fly Ash', 'Sand', 'Aggregates', 'Other'];
  const uomOptions = ['MT', 'Kg', 'Liters', 'Pieces', 'Bags'];
  const roles = ['Admin', 'Management', 'Loader', 'Weightment', 'Dispatch Verifier', 'Depot Supervisor', 'Depot Staff'];

  const columns = [
    { key: 'product_name', label: 'Product Name' },
    { key: 'product_code', label: 'Code', render: (v) => <span className="mono text-sm">{v || '-'}</span> },
    { key: 'category', label: 'Category' },
    { key: 'hsn_code', label: 'HSN Code', render: (v) => <span className="mono text-sm">{v || '-'}</span> },
    { key: 'unit_of_measurement', label: 'UOM' },
    { key: 'current_stock_level', label: 'Stock', render: (v) => v ? `${v} MT` : '0 MT' },
    {
      key: 'assigned_roles',
      label: 'Assigned Roles',
      render: (roles) => (roles && roles.length ? (
        <div className="flex flex-wrap gap-1">
          {roles.map((role) => (
            <span key={role} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{role}</span>
          ))}
        </div>
      ) : '-'),
    },
    {
      key: 'assigned_users',
      label: 'Assigned Users',
      render: (_, row) => {
        const roleUserIds = (row.assigned_roles || []).flatMap((role) => users.filter((u) => u.role === role).map((u) => u.id));
        const explicitUserIds = users.filter((u) => (u.assigned_products || []).includes(row.id)).map((u) => u.id);
        const allIds = Array.from(new Set([...explicitUserIds, ...roleUserIds]));
        return allIds.length ? (
          <div className="flex flex-wrap gap-1">
            {allIds.map((id) => {
              const user = users.find((u) => u.id === id);
              return (
                <span key={id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                  {user ? `${user.name}` : id}
                </span>
              );
            })}
          </div>
        ) : '-';
      }
    },
  ];

  return (
    <>
      <div className="flex justify-end mb-4">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx,.xls"
            className="hidden"
          />
          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="w-4 h-4 mr-2" />
            Template
          </Button>
          <Button variant="outline" onClick={handleImportClick} disabled={importing}>
            <Upload className="w-4 h-4 mr-2" />
            {importing ? 'Importing...' : 'Import Excel'}
          </Button>
          <Can action="create_product">
            <Button onClick={handleAdd} className="bg-brand hover:bg-brand/90" data-testid="add-product-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Can>
        </div>
      </div>

      <ProductsDataTable
        columns={columns}
        data={products}
        loading={loading}
        onEdit={hasActionPermission('update_product') ? handleEdit : undefined}
        onDelete={hasActionPermission('delete_product') ? handleDelete : undefined}
        emptyMessage="No products found. Add your first product!"
      />

      <FormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedItem ? 'Edit Product' : 'Add Product'}
        onSubmit={handleSubmit}
        loading={saving}
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="product_name">Product Name *</Label>
            <Input
              id="product_name"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              placeholder="Enter product name"
              data-testid="product-name-input"
            />
          </div>
          <div>
            <Label htmlFor="product_code">Product Code</Label>
            <Input
              id="product_code"
              value={formData.product_code}
              onChange={(e) => setFormData({ ...formData, product_code: e.target.value.toUpperCase() })}
              placeholder="e.g., CEM-001"
              className="mono"
            />
          </div>
          <div>
            <Label htmlFor="hsn_code">HSN Code</Label>
            <Input
              id="hsn_code"
              value={formData.hsn_code}
              onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
              placeholder="HSN Code"
              className="mono"
            />
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="unit_of_measurement">Unit of Measurement</Label>
            <Select
              value={formData.unit_of_measurement}
              onValueChange={(value) => setFormData({ ...formData, unit_of_measurement: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select UOM" />
              </SelectTrigger>
              <SelectContent>
                {uomOptions.map((uom) => (
                  <SelectItem key={uom} value={uom}>{uom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="current_stock_level">Current Stock Level</Label>
            <Input
              id="current_stock_level"
              type="number"
              step="0.001"
              value={formData.current_stock_level}
              onChange={(e) => setFormData({ ...formData, current_stock_level: e.target.value })}
              placeholder="Stock quantity"
            />
          </div>
          <div>
            <Label htmlFor="reorder_level">Reorder Level</Label>
            <Input
              id="reorder_level"
              type="number"
              step="0.001"
              value={formData.reorder_level}
              onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
              placeholder="Minimum stock"
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="product_description">Description</Label>
            <Textarea
              id="product_description"
              value={formData.product_description}
              onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
              placeholder="Product description"
              rows={2}
            />
          </div>
        </div>
      </FormModal>

      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        description={`Are you sure you want to delete "${selectedItem?.product_name}"? This action cannot be undone.`}
        loading={saving}
      />
    </>
  );
}

// ========================== OVERRIDES & PRICING TAB ==========================

function OverridesAndPricingTab() {
  const { user } = useAuth();
  const isMaster = !!user?.is_master_admin;
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [companyId, setCompanyId] = useState('');
  const [overrides, setOverrides] = useState({}); // product_id -> override
  const [pricing, setPricing] = useState({});     // product_id -> [rows]
  const [form, setForm] = useState({});           // product_id -> {code, name, min_stock, pricing_model}
  const [priceForm, setPriceForm] = useState({}); // product_id -> {tier, rate, valid_from, valid_to}
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null);
  const selectedCompany = companies.find(c => c.id === companyId);
  const displayProducts = isMaster && selectedCompany?.tenant_id ? products.filter(p => !p.tenant_id || p.tenant_id === selectedCompany.tenant_id) : products;
  const tenantsById = tenants.reduce((m, t) => { m[t.id] = t; return m; }, {});
  const getTenantLabel = (tenant) => {
    if (!tenant) return '';
    const name = (tenant.name || '').trim();
    const slug = (tenant.slug || '').trim();
    // show name if not too long, else slug, if no slug break name
    if (name && name.length <= 18) return name;
    if (slug) return slug;
    // break long name: allow wrapping, return name as is (CSS will break)
    return name;
  };

  useEffect(() => {
    (async () => {
      try {
        const [companiesRes, productsRes] = await Promise.all([
          companiesApi.getAll(),
          productsApi.getAll()
        ]);
        setCompanies(companiesRes.data || []);
        setProducts(productsRes.data || []);
        if (isMaster) {
          try {
            const tenantsRes = await tenantApi.getAll();
            setTenants(tenantsRes.data || []);
          } catch {}
        }
      } catch {
        toast.error('Failed to load data');
      }
    })();
  }, [isMaster]);

  const seedForms = (products, overridesMap, pricingMap) => {
    const f = {};
    const pf = {};
    products.forEach((p) => {
      const o = overridesMap[p.id] || {};
      f[p.id] = {
        code: o.code ?? p.product_code ?? '',
        name: o.name ?? '',
        description: o.description ?? '',
        min_stock: o.min_stock ?? 0,
        pricing_model: o.pricing_model ?? '',
      };
      pf[p.id] = { tier: '', rate: '', valid_from: '', valid_to: '' };
    });
    setForm(f);
    setPriceForm(pf);
  };

  const loadForCompany = async (cid) => {
    setCompanyId(cid);
    if (!cid) {
      setOverrides({});
      setPricing({});
      return;
    }
    setLoading(true);
    try {
      const [oRes, pRes] = await Promise.all([
        productManagementApi.getOverrides(cid),
        productManagementApi.getPricing(cid)
      ]);
      const oMap = {};
      (oRes.data || []).forEach((o) => { oMap[o.product_id] = o; });
      const pMap = {};
      (pRes.data || []).forEach((row) => {
        (pMap[row.product_id] = pMap[row.product_id] || []).push(row);
      });
      setOverrides(oMap);
      setPricing(pMap);
      // B: for master, filter products to that company's tenant
      const company = companies.find(c => c.id === cid);
      if (company?.tenant_id) {
        const filtered = products.filter(p => !p.tenant_id || p.tenant_id === company.tenant_id);
        seedForms(filtered.length ? filtered : products, oMap, pMap);
      } else {
        seedForms(products, oMap, pMap);
      }
    } catch {
      toast.error('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const saveOverride = async (product) => {
    if (!companyId) return;
    setSaving(`o-${product.id}`);
    try {
      const f = form[product.id];
      await productManagementApi.upsertOverride(product.id, {
        company_id: companyId,
        code: f.code,
        name: f.name,
        description: f.description,
        min_stock: parseFloat(f.min_stock) || 0,
        pricing_model: f.pricing_model,
      });
      toast.success('Override saved');
      await loadForCompany(companyId);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save override');
    } finally {
      setSaving(null);
    }
  };

  const addPricing = async (product) => {
    if (!companyId) return;
    const pf = priceForm[product.id];
    if (!pf.rate) {
      toast.error('Rate is required');
      return;
    }
    try {
      await productManagementApi.createPricing({
        company_id: companyId,
        product_id: product.id,
        tier: pf.tier || null,
        rate: parseFloat(pf.rate),
        currency: 'INR',
        valid_from: pf.valid_from || null,
        valid_to: pf.valid_to || null,
      });
      toast.success('Pricing added');
      await loadForCompany(companyId);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add pricing');
    }
  };

  const removePricing = async (row) => {
    try {
      await productManagementApi.deletePricing(row.id);
      toast.success('Pricing row deleted');
      await loadForCompany(companyId);
    } catch (error) {
      toast.error('Failed to delete pricing row');
    }
  };

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-800">
          <strong>Company-specific product settings.</strong> Pick a company, then override how its
          products are named/coded/priced. Overrides flow into reports and (later) invoicing; pricing
          rows are the rate list Phase 4 billing applies.
        </p>
      </div>

      <div className="mb-6 max-w-md">
        <Label htmlFor="company">Company *</Label>
        <Select value={companyId} onValueChange={loadForCompany}>
          <SelectTrigger>
            <SelectValue placeholder="Select company" />
          </SelectTrigger>
          <SelectContent>
            {companies.length === 0 ? (
              <div className="p-3 text-xs text-slate-500 text-center">No companies — seed demo or create a Client company first</div>
            ) : (
              companies.map((c) => {
                const t = tenantsById[c.tenant_id];
                const tenantLabel = isMaster ? getTenantLabel(t) : '';
                return (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-1.5 max-w-[260px]">
                      {tenantLabel && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono border flex-shrink-0">
                          {tenantLabel}
                        </span>
                      )}
                      <span className="truncate" style={{ wordBreak: 'break-word', whiteSpace: 'normal' }}>{c.name}</span>
                    </span>
                  </SelectItem>
                );
              })
            )}
          </SelectContent>
        </Select>
        {isMaster && (
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1 mt-2">Master view: all tenants (A) — picking a company filters products to that tenant (B)</p>
        )}
      </div>

      {!companyId && (
        <div className="text-center py-16 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-sm">Select a company to configure its product overrides and pricing.</p>
        </div>
      )}

      {companyId && (
        <div className="space-y-4">
          {loading && <div className="text-center py-8 text-slate-400 animate-pulse">Loading company settings...</div>}

          {!loading && displayProducts.map((product) => {
            const override = overrides[product.id];
            const pricingRows = pricing[product.id] || [];
            const f = form[product.id] || {};
            const pf = priceForm[product.id] || {};
            return (
              <div key={product.id} className="bg-white rounded-lg shadow-sm border p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${override ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {override ? 'OVERRIDDEN' : 'MASTER'}
                    </span>
                    <div>
                      <p className="font-semibold">{product.product_name}</p>
                      <p className="text-xs text-gray-500 font-mono">{product.product_code}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-slate-500">Override Code</Label>
                    <Input
                      value={f.code ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, [product.id]: { ...prev[product.id], code: e.target.value } }))}
                      placeholder={product.product_code}
                      className="mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-slate-500">Override Name</Label>
                    <Input
                      value={f.name ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, [product.id]: { ...prev[product.id], name: e.target.value } }))}
                      placeholder={product.product_name}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-slate-500">Min Stock</Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={f.min_stock ?? 0}
                      onChange={(e) => setForm((prev) => ({ ...prev, [product.id]: { ...prev[product.id], min_stock: e.target.value } }))}
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] uppercase tracking-wider text-slate-500">Pricing Model</Label>
                    <Input
                      value={f.pricing_model ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, [product.id]: { ...prev[product.id], pricing_model: e.target.value } }))}
                      placeholder="e.g. per_tonne"
                      className="text-xs"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      onClick={() => saveOverride(product)}
                      disabled={saving === `o-${product.id}`}
                      className="w-full bg-brand hover:bg-brand/90"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {saving === `o-${product.id}` ? 'Saving...' : 'Save Override'}
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <BadgeIndianRupee className="w-3.5 h-3.5" /> Pricing ({pricingRows.length})
                  </p>
                  <div className="space-y-1.5 mb-2">
                    {pricingRows.map((row) => (
                      <div key={row.id} className="flex items-center gap-3 text-xs bg-slate-50 rounded px-3 py-1.5">
                        <span className="font-mono font-bold text-emerald-700">₹{row.rate}</span>
                        {row.tier && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">{row.tier}</span>}
                        <span className="text-slate-500">
                          {row.valid_from || '—'} → {row.valid_to || '—'}
                        </span>
                        <span className="text-slate-400">{row.currency}</span>
                        <button
                          onClick={() => removePricing(row)}
                          className="ml-auto text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete pricing row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {pricingRows.length === 0 && (
                      <p className="text-xs text-slate-400">No pricing rows yet.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <Input
                      value={pf.tier ?? ''}
                      onChange={(e) => setPriceForm((prev) => ({ ...prev, [product.id]: { ...prev[product.id], tier: e.target.value } }))}
                      placeholder="Tier (optional)"
                      className="text-xs"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={pf.rate ?? ''}
                      onChange={(e) => setPriceForm((prev) => ({ ...prev, [product.id]: { ...prev[product.id], rate: e.target.value } }))}
                      placeholder="Rate *"
                      className="text-xs"
                    />
                    <Input
                      value={pf.valid_from ?? ''}
                      onChange={(e) => setPriceForm((prev) => ({ ...prev, [product.id]: { ...prev[product.id], valid_from: e.target.value } }))}
                      placeholder="Valid from (YYYY-MM-DD)"
                      className="text-xs font-mono"
                    />
                    <Input
                      value={pf.valid_to ?? ''}
                      onChange={(e) => setPriceForm((prev) => ({ ...prev, [product.id]: { ...prev[product.id], valid_to: e.target.value } }))}
                      placeholder="Valid to (YYYY-MM-DD)"
                      className="text-xs font-mono"
                    />
                    <Button size="sm" onClick={() => addPricing(product)} variant="outline">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Price
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}

          {!loading && products.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No products found.
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ============================== PAGE ==============================

export default function Products() {
  return (
    <PageLayout
      title="Products"
      subtitle="Manage the product catalog and company-specific settings"
    >
      <Tabs defaultValue="catalog">
        <TabsList className="mb-6">
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          <TabsTrigger value="overrides">Overrides & Pricing</TabsTrigger>
        </TabsList>
        <TabsContent value="catalog">
          <CatalogTab />
        </TabsContent>
        <TabsContent value="overrides">
          <OverridesAndPricingTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
