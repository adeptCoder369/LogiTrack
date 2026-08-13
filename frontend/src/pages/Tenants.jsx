"use client";

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Globe,
  ShieldCheck,
  Palette
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { tenantApi } from '../lib/api';
import { useAuth } from '../lib/auth';

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  suspended: 'bg-rose-50 text-rose-700 border-rose-100',
};

export default function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    status: "active",
    subscription_plan: "",
    brandingName: "",
    brandingLogo: "",
    brandingPrimary: "",
    brandingAccent: "",
    featureFlags: ""
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const loadTenants = async () => {
    setLoading(true);
    try {
      const response = await tenantApi.getAll();
      setTenants(response.data || []);
    } catch (error) {
      console.error('Failed to load tenants', error);
      toast.error('Unable to load Tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_master_admin) loadTenants();
  }, [user]);

  const buildPayload = () => ({
    name: formData.name,
    slug: formData.slug,
    subscription_plan: formData.subscription_plan || null,
    branding: {
      name: formData.brandingName,
      logo: formData.brandingLogo,
      primary: formData.brandingPrimary,
      accent: formData.brandingAccent,
    },
    feature_flags: formData.featureFlags
      ? Object.fromEntries(
          formData.featureFlags.split(',').map(s => [s.trim(), true]).filter(([k]) => k)
        )
      : {},
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error('Tenant name and slug are required');
      return;
    }
    try {
      if (editingTenant) {
        const response = await tenantApi.update(editingTenant.id, buildPayload());
        setTenants(prev => prev.map(item => item.id === editingTenant.id ? response.data : item));
        toast.success('Tenant updated');
      } else {
        const response = await tenantApi.create(buildPayload());
        setTenants(prev => [...prev, response.data]);
        toast.success('Tenant created');
      }
      setShowSidebar(false);
      setFormData({ name: "", slug: "", status: "active", subscription_plan: "", brandingName: "", brandingLogo: "", brandingPrimary: "", brandingAccent: "", featureFlags: "" });
      setEditingTenant(null);
    } catch (error) {
      console.error('Failed to save tenant', error);
      toast.error(error.response?.data?.detail || 'Unable to save Tenant');
    }
  };

  const handleEdit = (tenant) => {
    const branding = tenant.branding || {};
    setEditingTenant(tenant);
    setFormData({
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status || 'active',
      subscription_plan: tenant.subscription_plan || "",
      brandingName: branding.name || "",
      brandingLogo: branding.logo || "",
      brandingPrimary: branding.primary || "",
      brandingAccent: branding.accent || "",
      featureFlags: Object.keys(tenant.feature_flags || {}).join(', '),
    });
    setShowSidebar(true);
  };

  const filteredTenants = tenants.filter(t =>
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.slug || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">

      {/* Upper Statistics/Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Tenants
          </h1>
          <p className="text-xs text-slate-500">Multi-workspace management — branding, feature flags and subscription plans</p>
        </div>
        <button
          onClick={() => { setEditingTenant(null); setShowSidebar(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition-all duration-200 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Tenant
        </button>
      </div>

      {/* Analytical Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Tenants</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{tenants.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {tenants.filter(t => (t.status || 'active') === 'active').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Suspended</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {tenants.filter(t => t.status === 'suspended').length}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
              <Globe className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Branded</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {tenants.filter(t => t.branding && Object.keys(t.branding).length).length}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <Palette className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Utility Row */}
      <div className="flex bg-white p-3 rounded-lg shadow-sm border items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Showing {filteredTenants.length} entries</span>
        </div>
      </div>

      {/* Core Table Section */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 w-16 text-center">S.No</th>
                <th className="py-3 px-4">Tenant</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Subscription</th>
                <th className="py-3 px-4">Feature Flags</th>
                <th className="py-3 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTenants.length > 0 ? (
                filteredTenants.map((tenant, index) => (
                  <tr key={tenant.id} className="hover:bg-slate-50 transition duration-150 group">
                    <td className="py-3.5 px-4 font-mono text-center text-slate-400 font-medium">{index + 1}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                          {(tenant.branding?.name || tenant.name).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-900">{tenant.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-mono font-bold border border-blue-100">
                        {tenant.slug}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${STATUS_STYLES[tenant.status] || STATUS_STYLES.active}`}>
                        {tenant.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {tenant.subscription_plan || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(tenant.feature_flags || {}).length > 0
                          ? Object.entries(tenant.feature_flags || {}).map(([key, val]) => (
                              <span key={key} className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${val ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                {key}
                              </span>
                            ))
                          : <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleEdit(tenant)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit Tenant"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-12 text-slate-400 font-medium">
                    No Tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flyout Slidover Sidebar Form */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in p-6 overflow-y-auto">

            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTenant ? "Modify Tenant" : "Provision Tenant"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Workspace identity, branding and feature flags</p>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Tenant Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="e.g. Acme Logistics"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Slug</label>
                  <input
                    type="text"
                    name="slug"
                    required
                    placeholder="e.g. acme"
                    value={formData.slug}
                    onChange={(e) => handleInputChange({ target: { name: 'slug', value: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') } })}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Lowercase letters, numbers and hyphens. Used at login to disambiguate workspaces.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Subscription Plan</label>
                    <input
                      type="text"
                      name="subscription_plan"
                      placeholder="e.g. pro"
                      value={formData.subscription_plan}
                      onChange={handleInputChange}
                      className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">Branding</p>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Display Name</label>
                    <input
                      type="text"
                      name="brandingName"
                      placeholder="Shown in sidebar & login"
                      value={formData.brandingName}
                      onChange={handleInputChange}
                      className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Logo URL</label>
                    <input
                      type="text"
                      name="brandingLogo"
                      placeholder="https://..."
                      value={formData.brandingLogo}
                      onChange={handleInputChange}
                      className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Primary (HSL)</label>
                      <input
                        type="text"
                        name="brandingPrimary"
                        placeholder="222 47% 11%"
                        value={formData.brandingPrimary}
                        onChange={handleInputChange}
                        className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Accent (HSL)</label>
                      <input
                        type="text"
                        name="brandingAccent"
                        placeholder="24 95% 53%"
                        value={formData.brandingAccent}
                        onChange={handleInputChange}
                        className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Feature Flags</label>
                  <input
                    type="text"
                    name="featureFlags"
                    placeholder="invoices, stock_transfers (comma separated)"
                    value={formData.featureFlags}
                    onChange={handleInputChange}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Comma-separated keys, each enabled. Leave empty for none.</p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t pt-4 mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSidebar(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition"
                >
                  {editingTenant ? "Save Changes" : "Provision Tenant"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
