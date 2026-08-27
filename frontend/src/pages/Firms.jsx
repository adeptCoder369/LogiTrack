"use client";

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Trash2,
  Edit2,
  Network,
  Landmark,
  Factory,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { firmsApi, usersApi, productsApi, depotsApi, companiesApi } from '../lib/api';

const emptyForm = {
  name: '',
  parent_firm_id: '',
  company_id: '',
  city: '',
  state: '',
  contact_person: '',
  contact_mobile: '',
};

export default function Firms() {
  const [firms, setFirms] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Detail modal state (offices/factories/access)
  const [detailFirm, setDetailFirm] = useState(null);
  const [offices, setOffices] = useState([]);
  const [factories, setFactories] = useState([]);
  const [accessData, setAccessData] = useState(null);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [depots, setDepots] = useState([]);
  const [officeForm, setOfficeForm] = useState({ name: '', office_type: 'Branch', is_head_office: false, city: '' });
  const [factoryForm, setFactoryForm] = useState({ factory_name: '', product_id: '', city: '' });
  const [grantForm, setGrantForm] = useState({ user_id: '', product_id: '', depot_id: '' });
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState('offices');

  const loadFirms = async () => {
    try {
      const res = await firmsApi.getAll();
      setFirms(res.data || []);
    } catch {
      toast.error('Failed to load firms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFirms();
    (async () => {
      try {
        const [usersRes, productsRes, depotsRes, companiesRes] = await Promise.all([
          usersApi.getAll(),
          productsApi.getAll(),
          depotsApi.getAll(),
          companiesApi.getAll()
        ]);
        setUsers(usersRes.data || []);
        setProducts(productsRes.data || []);
        setDepots(depotsRes.data || []);
        setCompanies(companiesRes.data || []);
      } catch {
        // non-fatal
      }
    })();
  }, []);

  const loadDetail = async (firm) => {
    setDetailFirm(firm);
    setDetailTab('offices');
    setDetailLoading(true);
    try {
      const [officesRes, factoriesRes, accessRes] = await Promise.all([
        firmsApi.getOffices(firm.id),
        firmsApi.getFactories(firm.id),
        firmsApi.getAccess(firm.id)
      ]);
      setOffices(officesRes.data || []);
      setFactories(factoriesRes.data || []);
      setAccessData(accessRes.data);
    } catch {
      toast.error('Failed to load firm details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Firm name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await firmsApi.update(editing.id, formData);
        toast.success('Firm updated');
      } else {
        await firmsApi.create(formData);
        toast.success('Firm created');
      }
      setShowSidebar(false);
      setEditing(null);
      setFormData(emptyForm);
      await loadFirms();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save firm');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (firm) => {
    if (!confirm(`Delete firm "${firm.name}"? Offices, factories and access grants are removed too.`)) return;
    try {
      await firmsApi.delete(firm.id);
      toast.success('Firm deleted');
      await loadFirms();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete firm');
    }
  };

  const addOffice = async () => {
    if (!officeForm.name) {
      toast.error('Office name is required');
      return;
    }
    try {
      await firmsApi.addOffice(detailFirm.id, officeForm);
      toast.success('Office added');
      setOfficeForm({ name: '', office_type: 'Branch', is_head_office: false, city: '' });
      await loadDetail(detailFirm);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add office');
    }
  };

  const deleteOffice = async (office) => {
    try {
      await firmsApi.deleteOffice(detailFirm.id, office.id);
      toast.success('Office deleted');
      await loadDetail(detailFirm);
    } catch {
      toast.error('Failed to delete office');
    }
  };

  const addFactory = async () => {
    if (!factoryForm.factory_name || !factoryForm.product_id) {
      toast.error('Factory name and product are required');
      return;
    }
    try {
      await firmsApi.addFactory(detailFirm.id, factoryForm);
      toast.success('Factory added');
      setFactoryForm({ factory_name: '', product_id: '', city: '' });
      await loadDetail(detailFirm);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add factory');
    }
  };

  const deleteFactory = async (factory) => {
    try {
      await firmsApi.deleteFactory(detailFirm.id, factory.id);
      toast.success('Factory deleted');
      await loadDetail(detailFirm);
    } catch {
      toast.error('Failed to delete factory');
    }
  };

  const grantAccess = async () => {
    if (!grantForm.user_id || !grantForm.product_id || !grantForm.depot_id) {
      toast.error('User, product and depot are required');
      return;
    }
    try {
      await firmsApi.grantAccess(detailFirm.id, grantForm);
      toast.success('Access granted');
      setGrantForm({ user_id: '', product_id: '', depot_id: '' });
      await loadDetail(detailFirm);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to grant access');
    }
  };

  const revokeAccess = async (grant) => {
    try {
      await firmsApi.revokeAccess(detailFirm.id, grant.id);
      toast.success('Access revoked');
      await loadDetail(detailFirm);
    } catch {
      toast.error('Failed to revoke access');
    }
  };

  const filteredFirms = firms.filter((f) =>
    (f.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const firmName = (id) => firms.find((f) => f.id === id)?.name || '—';
  const productName = (id) => products.find((p) => p.id === id)?.product_name || id;
  const depotName = (id) => depots.find((d) => d.id === id)?.name || id;

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Firms
          </h1>
          <p className="text-xs text-slate-500">Firm structure with per-user product × depot access grants</p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormData(emptyForm); setShowSidebar(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition-all duration-200 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Firm
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Firms</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{firms.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Head Offices</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">—</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <Landmark className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Child Firms</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{firms.filter((f) => f.parent_firm_id).length}</p>
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
              <Network className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Factories</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">—</p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <Factory className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex bg-white p-3 rounded-lg shadow-sm border items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search firms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
        <span className="text-xs text-slate-500">{filteredFirms.length} firms</span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Firm</th>
                <th className="py-3 px-4">Parent</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredFirms.length > 0 ? (
                filteredFirms.map((firm) => (
                  <tr key={firm.id} className="hover:bg-slate-50 transition group">
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{firm.name}</td>
                    <td className="py-3.5 px-4 text-slate-500">{firm.parent_firm_id ? firmName(firm.parent_firm_id) : '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600">{firm.city || '—'}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {firm.contact_person ? `${firm.contact_person}${firm.contact_mobile ? ` (${firm.contact_mobile})` : ''}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => loadDetail(firm)}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-white rounded transition"
                          title="Offices / Factories / Access"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => {
                            setEditing(firm);
                            setFormData({
                              name: firm.name || '',
                              parent_firm_id: firm.parent_firm_id || '',
                              company_id: firm.company_id || '',
                              city: firm.city || '',
                              state: firm.state || '',
                              contact_person: firm.contact_person || '',
                              contact_mobile: firm.contact_mobile || '',
                            });
                            setShowSidebar(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit Firm"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(firm)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete Firm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-400 font-medium">
                    {loading ? 'Loading...' : 'No firms found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit modal */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">{editing ? 'Edit Firm' : 'Add Firm'}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Parent/child firm structure</p>
              </div>
              <button onClick={() => setShowSidebar(false)} className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Firm Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Parent Firm</label>
                <select
                  value={formData.parent_firm_id}
                  onChange={(e) => setFormData({ ...formData, parent_firm_id: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">— None —</option>
                  {firms.filter((f) => f.id !== (editing?.id || '')).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Linked Company (optional)</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">— None —</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Contact Mobile</label>
                  <input
                    type="text"
                    value={formData.contact_mobile}
                    onChange={(e) => setFormData({ ...formData, contact_mobile: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="border-t pt-4 mt-6 flex gap-3">
                <button type="button" onClick={() => setShowSidebar(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition">
                  {saving ? 'Saving...' : (editing ? 'Save Firm' : 'Create Firm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailFirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{detailFirm.name}</h2>
                <p className="text-xs text-slate-500">Offices, factories and access grants</p>
              </div>
              <button onClick={() => setDetailFirm(null)} className="text-slate-400 hover:text-slate-600 text-xl font-mono p-1">✕</button>
            </div>

            <div className="px-6 pt-4">
              <div className="flex gap-2 border-b">
                {[
                  { key: 'offices', label: 'Offices', icon: Landmark },
                  { key: 'factories', label: 'Factories', icon: Factory },
                  { key: 'access', label: 'Access Grants', icon: ShieldCheck },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setDetailTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border-b-2 transition-colors ${
                      detailTab === tab.key ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="text-center py-10 text-slate-400 animate-pulse">Loading...</div>
              ) : (
                <>
                  {detailTab === 'offices' && (
                    <div className="space-y-2 mb-4">
                      {offices.map((office) => (
                        <div key={office.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 text-sm">{office.name}</span>
                              {office.is_head_office && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">HEAD OFFICE</span>}
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{office.office_type}</span>
                            </div>
                            <p className="text-xs text-slate-500">{office.city || ''}{office.contact_person ? ` • ${office.contact_person}` : ''}</p>
                          </div>
                          <button onClick={() => deleteOffice(office)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {offices.length === 0 && <p className="text-xs text-slate-400">No offices yet.</p>}
                      <div className="flex gap-2 mt-3">
                        <input
                          value={officeForm.name}
                          onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })}
                          placeholder="Office name *"
                          className="text-xs p-2 border rounded flex-1"
                        />
                        <select
                          value={officeForm.office_type}
                          onChange={(e) => setOfficeForm({ ...officeForm, office_type: e.target.value, is_head_office: e.target.value === 'Head Office' })}
                          className="text-xs p-2 border rounded bg-white"
                        >
                          <option value="Head Office">Head Office</option>
                          <option value="Branch">Branch</option>
                        </select>
                        <button onClick={addOffice} className="px-3 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}

                  {detailTab === 'factories' && (
                    <div className="space-y-2 mb-4">
                      {factories.map((factory) => (
                        <div key={factory.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-800 text-sm">{factory.factory_name}</span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">{productName(factory.product_id)}</span>
                            </div>
                            <p className="text-xs text-slate-500">{factory.city || ''}</p>
                          </div>
                          <button onClick={() => deleteFactory(factory)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {factories.length === 0 && <p className="text-xs text-slate-400">No factories yet.</p>}
                      <div className="flex gap-2 mt-3">
                        <input
                          value={factoryForm.factory_name}
                          onChange={(e) => setFactoryForm({ ...factoryForm, factory_name: e.target.value })}
                          placeholder="Factory name *"
                          className="text-xs p-2 border rounded flex-1"
                        />
                        <select
                          value={factoryForm.product_id}
                          onChange={(e) => setFactoryForm({ ...factoryForm, product_id: e.target.value })}
                          className="text-xs p-2 border rounded bg-white flex-1"
                        >
                          <option value="">Product *</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.product_name}</option>
                          ))}
                        </select>
                        <button onClick={addFactory} className="px-3 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}

                  {detailTab === 'access' && (
                    <div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                        <p className="text-xs text-blue-800">
                          Grant a user access to this firm scoped to a specific <strong>product × depot</strong> pair.
                          Enforcement of these grants lands with employee management.
                        </p>
                      </div>
                      <div className="space-y-4">
                        {accessData?.users?.map((entry) => (
                          <div key={entry.user_id} className="bg-slate-50 rounded-lg border border-slate-100 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-slate-800 text-sm">{entry.user_name}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{entry.role}</span>
                              <span className="ml-auto text-[10px] text-slate-400">{entry.grant_count} grant(s)</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {entry.grants.map((g) => (
                                <span key={g.id} className="flex items-center gap-1 bg-white border border-slate-200 rounded px-2 py-1 text-[11px]">
                                  <span className="font-semibold text-emerald-700">{productName(g.product_id)}</span>
                                  <span className="text-slate-300">×</span>
                                  <span className="text-slate-600">{depotName(g.depot_id)}</span>
                                  <button onClick={() => revokeAccess(g)} className="text-slate-300 hover:text-rose-600 ml-1"><Trash2 className="w-3 h-3" /></button>
                                </span>
                              ))}
                              {entry.grants.length === 0 && <span className="text-[11px] text-slate-400">No grants.</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4 border-t pt-4">
                        <select
                          value={grantForm.user_id}
                          onChange={(e) => setGrantForm({ ...grantForm, user_id: e.target.value })}
                          className="text-xs p-2 border rounded bg-white"
                        >
                          <option value="">User *</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                        <select
                          value={grantForm.product_id}
                          onChange={(e) => setGrantForm({ ...grantForm, product_id: e.target.value })}
                          className="text-xs p-2 border rounded bg-white"
                        >
                          <option value="">Product *</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.product_name}</option>
                          ))}
                        </select>
                        <select
                          value={grantForm.depot_id}
                          onChange={(e) => setGrantForm({ ...grantForm, depot_id: e.target.value })}
                          className="text-xs p-2 border rounded bg-white"
                        >
                          <option value="">Depot *</option>
                          {depots.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                        <button onClick={grantAccess} className="md:col-span-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded">
                          <Plus className="w-3.5 h-3.5 inline mr-1" /> Grant Access
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
