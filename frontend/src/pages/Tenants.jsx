"use client";

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Globe,
  ShieldCheck,
  Palette,
  Phone,
  Mail,
  User,
  ChevronDown,
  Check,
  X,
  Trash2
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { DeleteDialog } from "../components/shared/DeleteDialog";
import { toast } from 'sonner';
import { tenantApi, getFileUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { FileUpload } from '../components/shared/FileUpload';

// HSL <-> HEX helpers for color picker (theme expects HSL triplet like "222 47% 11%")
function hslToHex(hsl) {
  if (!hsl) return '#1e293b';
  if (hsl.startsWith('#')) return hsl;
  const parts = hsl.trim().split(/\s+/);
  if (parts.length !== 3) return '#1e293b';
  let h = parseFloat(parts[0]);
  let s = parseFloat(parts[1].replace('%', '')) / 100;
  let l = parseFloat(parts[2].replace('%', '')) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  r = Math.round((r + m) * 255); g = Math.round((g + m) * 255); b = Math.round((b + m) * 255);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}
function hexToHsl(hex) {
  let r = 0, g = 0, b = 0;
  if (hex.startsWith('#')) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return '222 47% 11%';
  r = parseInt(hex.slice(0, 2), 16) / 255;
  g = parseInt(hex.slice(2, 4), 16) / 255;
  b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  s = Math.round(s * 100); l = Math.round(l * 100); h = Math.round(h);
  return `${h} ${s}% ${l}%`;
}

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
    brandingSecondary: "",
    brandingText: "",
    featureFlags: "",
    ownerName: "",
    ownerMobile: "",
    ownerEmail: ""
  });
  const [flagDropdownOpen, setFlagDropdownOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const KNOWN_FLAGS = ["invoices", "stock_transfers", "leads", "firms", "payments", "reports", "analytics"];
  const PLATFORM_TENANT_ID = "11111111-1111-1111-1111-111111111111";

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const toggleFlag = (flag) => {
    const current = formData.featureFlags ? formData.featureFlags.split(',').map(s => s.trim()).filter(Boolean) : [];
    const next = current.includes(flag) ? current.filter(f => f !== flag) : [...current, flag];
    setFormData(prev => ({ ...prev, featureFlags: next.join(', ') }));
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

  const buildPayload = () => {
    const base = {
      name: formData.name,
      slug: formData.slug,
      subscription_plan: formData.subscription_plan || null,
      branding: {
        name: formData.brandingName,
        logo: formData.brandingLogo,
        primary: formData.brandingPrimary,
        accent: formData.brandingAccent,
        secondary: formData.brandingSecondary,
        text: formData.brandingText,
      },
      feature_flags: formData.featureFlags
        ? Object.fromEntries(
            formData.featureFlags.split(',').map(s => [s.trim(), true]).filter(([k]) => k)
          )
        : {},
    };
    // owner only on create — mirrors backend TenantCreate owner_* optional
    if (!editingTenant) {
      base.owner_name = formData.ownerName?.trim() || null;
      base.owner_mobile = formData.ownerMobile?.trim() || null;
      base.owner_email = formData.ownerEmail?.trim() || null;
    }
    return base;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.slug) {
      toast.error('Tenant name and slug are required');
      return;
    }
    if (!editingTenant && (formData.ownerName || formData.ownerMobile) && !(formData.ownerName && formData.ownerMobile)) {
      toast.error('Owner name and mobile are both required');
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
        if (response.data?.owner) {
          toast.success(`Tenant created — owner ${response.data.owner.name} (${response.data.owner.mobile}) can now login via OTP`);
        } else {
          toast.success('Tenant created');
        }
      }
      setShowSidebar(false);
      setFormData({ name: "", slug: "", status: "active", subscription_plan: "", brandingName: "", brandingLogo: "", brandingPrimary: "", brandingAccent: "", brandingSecondary: "", brandingText: "", featureFlags: "", ownerName: "", ownerMobile: "", ownerEmail: "" });
      setEditingTenant(null);
    } catch (error) {
      console.error('Failed to save tenant', error);
      toast.error(error.response?.data?.detail || 'Unable to save Tenant');
    }
  };

  const handleDelete = (tenant) => {
    setDeletingTenant(tenant);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTenant) return;
    setDeleting(true);
    try {
      const response = await tenantApi.remove(deletingTenant.id);
      setTenants(prev => prev.filter(item => item.id !== deletingTenant.id));
      toast.success(response.data?.message || `Tenant '${deletingTenant.slug}' deleted`);
      setDeleteOpen(false);
      setDeletingTenant(null);
    } catch (error) {
      console.error('Failed to delete tenant', error);
      toast.error(error.response?.data?.detail || 'Unable to delete Tenant');
    } finally {
      setDeleting(false);
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
      brandingSecondary: branding.secondary || "",
      brandingText: branding.text || "",
      featureFlags: Object.keys(tenant.feature_flags || {}).join(', '),
      ownerName: "",
      ownerMobile: "",
      ownerEmail: ""
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
          onClick={() => {
            setEditingTenant(null);
            setFormData({ name: "", slug: "", status: "active", subscription_plan: "", brandingName: "", brandingLogo: "", brandingPrimary: "", brandingAccent: "", brandingSecondary: "", brandingText: "", featureFlags: "", ownerName: "", ownerMobile: "", ownerEmail: "" });
            setShowSidebar(true);
          }}
          className="flex items-center justify-center gap-2 bg-brand hover:bg-brand/90 text-primary-foreground font-medium text-xs px-4 py-2.5 rounded-lg shadow transition-all duration-200 self-start md:self-auto"
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
                <th className="py-3 px-4">Owner</th>
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
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden border border-slate-200">
                          {tenant.branding?.logo ? (
                            <img
                              src={tenant.branding.logo.startsWith('http') ? tenant.branding.logo : getFileUrl(tenant.branding.logo)}
                              alt={tenant.name}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.nextSibling.style.display='flex'; }}
                            />
                          ) : null}
                          <span style={{ display: tenant.branding?.logo ? 'none' : 'flex' }}>{(tenant.branding?.name || tenant.name).charAt(0).toUpperCase()}</span>
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
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${STATUS_STYLES[tenant.status] || STATUS_STYLES.active}`}>
                          {tenant.status || 'active'}
                        </span>
                        {tenant.subscription_status === 'trialing' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-violet-50 text-violet-700 border-violet-200 tracking-wide" title="Trial subscription">
                            TRIAL
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {tenant.subscription_plan || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      {tenant.owner ? (
                        <div className="space-y-1 min-w-[170px]">
                          <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
                            <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{tenant.owner.name}</span>
                            {!tenant.owner.password_set && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100">OTP</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px]">
                            <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{tenant.owner.mobile?.startsWith('91') && tenant.owner.mobile.length === 12 ? `+91 ${tenant.owner.mobile.slice(2,7)} ${tenant.owner.mobile.slice(7)}` : tenant.owner.mobile}</span>
                          </div>
                          {tenant.owner.email ? (
                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate">
                              <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="truncate">{tenant.owner.email}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] italic">No email</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEdit(tenant)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit Tenant"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {tenant.id !== PLATFORM_TENANT_ID && (
                          <button
                            onClick={() => handleDelete(tenant)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete Tenant (removes all tenant data)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400 font-medium">
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
                    <FileUpload
                      value={formData.brandingLogo}
                      onChange={(val) => setFormData(prev => ({ ...prev, brandingLogo: val || "" }))}
                      label="Logo (image upload)"
                      accept="image/*"
                      showCameraOption={false}
                    />
                    {formData.brandingLogo && !formData.brandingLogo.startsWith('http') && (
                      <p className="text-[10px] text-slate-400 mt-1">Stored as file_id. Preview via secure download URL.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Primary</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={hslToHex(formData.brandingPrimary)}
                          onChange={(e) => setFormData(prev => ({ ...prev, brandingPrimary: hexToHsl(e.target.value) }))}
                          className="w-10 h-9 p-1 border rounded cursor-pointer bg-white"
                          title="Pick primary color"
                        />
                        <input
                          type="text"
                          name="brandingPrimary"
                          placeholder="222 47% 11%"
                          value={formData.brandingPrimary}
                          onChange={handleInputChange}
                          className="flex-1 text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">HSL triplet, picker auto-converts.</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Accent</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={hslToHex(formData.brandingAccent)}
                          onChange={(e) => setFormData(prev => ({ ...prev, brandingAccent: hexToHsl(e.target.value) }))}
                          className="w-10 h-9 p-1 border rounded cursor-pointer bg-white"
                          title="Pick accent color"
                        />
                        <input
                          type="text"
                          name="brandingAccent"
                          placeholder="24 95% 53%"
                          value={formData.brandingAccent}
                          onChange={handleInputChange}
                          className="flex-1 text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">HSL triplet, picker auto-converts.</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Secondary</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={hslToHex(formData.brandingSecondary || '0 0% 100%')}
                          onChange={(e) => setFormData(prev => ({ ...prev, brandingSecondary: hexToHsl(e.target.value) }))}
                          className="w-10 h-9 p-1 border rounded cursor-pointer bg-white"
                          title="Pick secondary color"
                        />
                        <input
                          type="text"
                          name="brandingSecondary"
                          placeholder="0 0% 100%"
                          value={formData.brandingSecondary}
                          onChange={handleInputChange}
                          className="flex-1 text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Tiles, badges & surfaces.</p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Text</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={hslToHex(formData.brandingText || '222 84% 5%')}
                          onChange={(e) => setFormData(prev => ({ ...prev, brandingText: hexToHsl(e.target.value) }))}
                          className="w-10 h-9 p-1 border rounded cursor-pointer bg-white"
                          title="Pick text color"
                        />
                        <input
                          type="text"
                          name="brandingText"
                          placeholder="222 84% 5%"
                          value={formData.brandingText}
                          onChange={handleInputChange}
                          className="flex-1 text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Headings & key text on light surfaces.</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-lg border bg-slate-50 flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] font-semibold text-slate-500">Preview:</span>
                    <span className="px-3 py-1.5 rounded-md text-xs font-bold shadow-sm" style={{ backgroundColor: `hsl(${formData.brandingPrimary || '222 47% 11%'})`, color: 'hsl(210 40% 98%)' }}>Primary</span>
                    <span className="px-3 py-1.5 rounded-md text-xs font-bold shadow-sm" style={{ backgroundColor: `hsl(${formData.brandingAccent || '24 95% 53%'})`, color: 'white' }}>Accent</span>
                    <span className="px-3 py-1.5 rounded-md text-xs font-bold shadow-sm border" style={{ backgroundColor: `hsl(${formData.brandingSecondary || '0 0% 100%'})`, color: `hsl(${formData.brandingText || '222 84% 5%'})` }}>Secondary + Text</span>
                    <span className="w-8 h-8 rounded-md border shadow-sm brand-gradient" style={{ background: `linear-gradient(135deg, hsl(${formData.brandingPrimary || '222 47% 11%'}) 0%, hsl(${formData.brandingAccent || '24 95% 53%'}) 100%)` }} title="Gradient preview" />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Feature Flags</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setFlagDropdownOpen(!flagDropdownOpen)}
                      className="w-full flex items-center justify-between text-xs p-2.5 border rounded bg-white hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[38px]"
                    >
                      <div className="flex flex-wrap gap-1.5 flex-1 text-left">
                        {formData.featureFlags ? (
                          formData.featureFlags.split(',').map(s => s.trim()).filter(Boolean).map(flag => (
                            <span key={flag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-medium">
                              {flag}
                              <span
                                role="button"
                                onClick={(e) => { e.stopPropagation(); toggleFlag(flag); }}
                                className="ml-0.5 hover:bg-blue-100 rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </span>
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400">Select features...</span>
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 ml-2 transition-transform ${flagDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {flagDropdownOpen && (
                      <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-48 overflow-auto">
                        {KNOWN_FLAGS.map(flag => {
                          const selected = formData.featureFlags.split(',').map(s => s.trim()).includes(flag);
                          return (
                            <label key={flag} className="flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleFlag(flag)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className={`flex-1 ${selected ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{flag}</span>
                              {selected && <Check className="w-4 h-4 text-blue-600" />}
                            </label>
                          );
                        })}
                        <div className="border-t p-2 flex justify-between items-center bg-slate-50">
                          <span className="text-[10px] text-slate-500">{formData.featureFlags ? formData.featureFlags.split(',').filter(Boolean).length : 0} selected</span>
                          <button type="button" onClick={() => setFlagDropdownOpen(false)} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Done</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Pick from known modules — invoices, stock_transfers, leads, firms, etc.</p>
                </div>

                {!editingTenant && (
                  <div className="border-t pt-4 bg-amber-50/50 -mx-6 px-6 py-4 rounded">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1">Owner Login — OTP first-time setup (A)</p>
                    <p className="text-[10px] text-slate-500 mb-3">Master creates the tenant owner Management login. Owner will receive OTP on first login to set own password. Leave blank to create tenant without owner.</p>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Owner Name</label>
                      <input
                        type="text"
                        name="ownerName"
                        placeholder="e.g. Priya Patel"
                        value={formData.ownerName}
                        onChange={handleInputChange}
                        className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="mt-3">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Owner Mobile (10 digits)</label>
                      <input
                        type="text"
                        name="ownerMobile"
                        placeholder="e.g. 9876543210"
                        value={formData.ownerMobile}
                        onChange={handleInputChange}
                        className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                      />
                    </div>
                    <div className="mt-3">
                      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Owner Email (optional)</label>
                      <input
                        type="email"
                        name="ownerEmail"
                        placeholder="owner@acme.test"
                        value={formData.ownerEmail}
                        onChange={handleInputChange}
                        className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
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
                  className="flex-1 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand/90 rounded-md shadow-sm transition"
                >
                  {editingTenant ? "Save Changes" : "Provision Tenant"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      <DeleteDialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeletingTenant(null); }}
        onConfirm={handleConfirmDelete}
        title="Delete Tenant"
        description={`Are you sure you want to completely delete "${deletingTenant?.name}" (${deletingTenant?.slug})? This removes the tenant, its owner login, companies, depots, products, orders, invoices, transfers and all other tenant data. This action cannot be undone.`}
        loading={deleting}
      />

    </div>
  );
}
