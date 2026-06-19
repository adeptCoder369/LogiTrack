import { useState, useEffect, useRef } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { FormModal } from '../components/shared/FormModal';
import { DeleteDialog } from '../components/shared/DeleteDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { productsApi, importApi, usersApi } from '../lib/api';
import { toast } from 'sonner';
import { Plus, Upload, Download } from 'lucide-react';
import { ProductsDataTable } from '@/components/products/DataTable';
import { Checkbox } from '../components/ui/checkbox';
import { Can } from '../components/Can';
import { usePermissions } from '../lib/permissions';

export default function Products() {
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
      assigned_roles: [],
      assigned_user_ids: [],
      excluded_user_ids: [],
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
        current_stock_level: formData.current_stock_level ? parseFloat(formData.current_stock_level) : 0,
        reorder_level: formData.reorder_level ? parseFloat(formData.reorder_level) : null,
        assigned_roles: [...new Set([...formData.assigned_roles, 'Management'])],
      };
      let productId = selectedItem ? selectedItem.id : null;
      if (selectedItem) {
        await productsApi.update(selectedItem.id, payload);
        toast.success('Product updated successfully');
      } else {
        const response = await productsApi.create(payload);
        productId = response.data.id;
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
    window.open(importApi.getTemplate('products'), '_blank');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    try {
      const response = await importApi.bulkImport('products', file);
      const { imported, errors, total_errors } = response.data;
      
      if (imported > 0) {
        toast.success(`Successfully imported ${imported} products`);
        fetchProducts();
      }
      
      if (total_errors > 0) {
        toast.error(`${total_errors} rows had errors`);
        errors.forEach(err => console.error(err));
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const categoryOptions = ['Cement', 'Steel', 'Iron Ore', 'Coal', 'Limestone', 'Fly Ash', 'Sand', 'Aggregates', 'Other'];
  const uomOptions = ['MT', 'Kg', 'Liters', 'Pieces', 'Bags'];
  const roles = ['Admin', 'Management', 'Loader', 'Depot Manager', 'Depot Supervisor', 'Depot Staff'];

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
    <PageLayout
      title="Products"
      subtitle="Manage product catalog"
      actions={
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
            <Button onClick={handleAdd} className="bg-slate-900 hover:bg-slate-800" data-testid="add-product-btn">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Can>
        </div>
      }
    >
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
    </PageLayout>
  );
}
