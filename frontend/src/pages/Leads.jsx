"use client";

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Plus,
  Search,
  Trash2,
  Edit2,
  Target,
  ArrowRightLeft,
  UserCheck,
  Phone
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { leadsApi, usersApi, companiesApi } from '../lib/api';

const STATUS_STYLES = {
  'New': 'bg-blue-50 text-blue-700 border-blue-100',
  'Contacted': 'bg-amber-50 text-amber-700 border-amber-100',
  'Qualified': 'bg-purple-50 text-purple-700 border-purple-100',
  'Converted': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Lost': 'bg-rose-50 text-rose-700 border-rose-100',
};

const emptyForm = {
  lead_type: 'Sales',
  company_id: '',
  company_name: '',
  status: 'New',
  parent_client_id: '',
  assigned_employee_id: '',
  assigned_employee_name: '',
  contact_person: '',
  contact_mobile: '',
  notes: '',
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showSidebar, setShowSidebar] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(null);

  const loadLeads = async () => {
    try {
      const res = await leadsApi.getAll(statusFilter === 'all' ? {} : { status: statusFilter });
      setLeads(res.data || []);
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [statusFilter]);

  useEffect(() => {
    (async () => {
      try {
        const [usersRes, companiesRes] = await Promise.all([
          usersApi.getAll(),
          companiesApi.getAll()
        ]);
        setUsers(usersRes.data || []);
        setCompanies(companiesRes.data || []);
      } catch {
        // non-fatal
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company_name && !formData.company_id) {
      toast.error('Company name is required');
      return;
    }
    setSaving(true);
    try {
      const employee = users.find((u) => u.id === formData.assigned_employee_id);
      const payload = {
        ...formData,
        assigned_employee_name: employee?.name || formData.assigned_employee_name,
      };
      if (editing) {
        await leadsApi.update(editing.id, payload);
        toast.success('Lead updated');
      } else {
        await leadsApi.create(payload);
        toast.success('Lead created');
      }
      setShowSidebar(false);
      setEditing(null);
      setFormData(emptyForm);
      await loadLeads();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lead) => {
    if (!confirm(`Delete lead "${lead.company_name}"?`)) return;
    try {
      await leadsApi.delete(lead.id);
      toast.success('Lead deleted');
      await loadLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const handleConvert = async (lead) => {
    if (!confirm(`Convert "${lead.company_name}" into a client? A company record will be created and the assigned employee linked to it.`)) return;
    setConverting(lead.id);
    try {
      await leadsApi.convert(lead.id);
      toast.success('Lead converted to client');
      await loadLeads();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Conversion failed');
    } finally {
      setConverting(null);
    }
  };

  const filteredLeads = leads.filter((l) =>
    (l.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.contact_person || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const counts = {
    total: leads.length,
    converted: leads.filter((l) => l.status === 'Converted').length,
    qualified: leads.filter((l) => l.status === 'Qualified').length,
    lost: leads.filter((l) => l.status === 'Lost').length,
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Leads
          </h1>
          <p className="text-xs text-slate-500">Sales & purchase leads — convert them into clients</p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormData(emptyForm); setShowSidebar(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition-all duration-200 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Leads</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{counts.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Target className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Qualified</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{counts.qualified}</p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Converted</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{counts.converted}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Lost</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{counts.lost}</p>
            </div>
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex bg-white p-3 rounded-lg shadow-sm border items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by company or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs p-2 border rounded-md bg-white"
        >
          <option value="all">All statuses</option>
          {['New', 'Contacted', 'Qualified', 'Converted', 'Lost'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition group">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{lead.company_name || '—'}</p>
                      {lead.parent_client_id && (
                        <p className="text-[10px] text-slate-400">
                          parent: {companies.find((c) => c.id === lead.parent_client_id)?.name || lead.parent_client_id}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${lead.lead_type === 'Sales' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                        {lead.lead_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${STATUS_STYLES[lead.status] || STATUS_STYLES['New']}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {lead.assigned_employee_name ? (
                        <span className="flex items-center gap-1.5 text-slate-600">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          {lead.assigned_employee_name}
                        </span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {lead.contact_person ? (
                        <div>
                          <p>{lead.contact_person}</p>
                          {lead.contact_mobile && (
                            <p className="flex items-center gap-1 text-slate-400"><Phone className="w-3 h-3" />{lead.contact_mobile}</p>
                          )}
                        </div>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {lead.status !== 'Converted' && lead.status !== 'Lost' && (
                          <button
                            onClick={() => handleConvert(lead)}
                            disabled={converting === lead.id}
                            className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition disabled:opacity-50"
                            title="Convert to client"
                          >
                            {converting === lead.id ? '...' : 'Convert'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditing(lead);
                            setFormData({
                              lead_type: lead.lead_type || 'Sales',
                              company_id: lead.company_id || '',
                              company_name: lead.company_name || '',
                              status: lead.status || 'New',
                              parent_client_id: lead.parent_client_id || '',
                              assigned_employee_id: lead.assigned_employee_id || '',
                              assigned_employee_name: lead.assigned_employee_name || '',
                              contact_person: lead.contact_person || '',
                              contact_mobile: lead.contact_mobile || '',
                              notes: lead.notes || '',
                            });
                            setShowSidebar(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                          title="Edit Lead"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(lead)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-slate-400 font-medium">
                    {loading ? 'Loading...' : 'No leads found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showSidebar && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">{editing ? 'Edit Lead' : 'Add Lead'}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Track before conversion to a client</p>
              </div>
              <button onClick={() => setShowSidebar(false)} className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Lead Type</label>
                    <select
                      value={formData.lead_type}
                      onChange={(e) => setFormData({ ...formData, lead_type: e.target.value })}
                      className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      <option value="Sales">Sales</option>
                      <option value="Purchase">Purchase</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    >
                      {['New', 'Contacted', 'Qualified', 'Converted', 'Lost'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="e.g. Acme Traders"
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Linked Company (existing record, optional)</label>
                  <select
                    value={formData.company_id}
                    onChange={(e) => {
                      const c = companies.find((x) => x.id === e.target.value);
                      setFormData({
                        ...formData,
                        company_id: e.target.value,
                        company_name: c?.name || formData.company_name,
                      });
                    }}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="">— None —</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Parent Client (for converted client)</label>
                  <select
                    value={formData.parent_client_id}
                    onChange={(e) => setFormData({ ...formData, parent_client_id: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="">— None —</option>
                    {companies.filter((c) => (c.entity_roles || []).includes('Client') || c.is_client).map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Assigned Employee</label>
                  <select
                    value={formData.assigned_employee_id}
                    onChange={(e) => {
                      const u = users.find((x) => x.id === e.target.value);
                      setFormData({
                        ...formData,
                        assigned_employee_id: e.target.value,
                        assigned_employee_name: u?.name || '',
                      });
                    }}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="">— Unassigned —</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">On conversion, this employee's user record is linked to the new client company.</p>
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

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Notes</label>
                  <textarea
                    rows="3"
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Lead context, requirements..."
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-6 flex gap-3">
                <button type="button" onClick={() => setShowSidebar(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition">
                  {saving ? 'Saving...' : (editing ? 'Save Lead' : 'Create Lead')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
