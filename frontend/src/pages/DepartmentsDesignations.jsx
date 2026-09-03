"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Edit2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { departmentsApi, designationsApi } from '../lib/api';

function DepartmentsTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await departmentsApi.getAll();
      setItems(res.data || []);
    } catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editing) { await departmentsApi.update(editing.id, formData); toast.success('Department updated'); }
      else { await departmentsApi.create(formData); toast.success('Department created'); }
      setFormOpen(false); setEditing(null); setFormData({ name: '', description: '' }); await load();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try { await departmentsApi.delete(item.id); toast.success('Deleted'); await load(); }
    catch (error) { toast.error(error.response?.data?.detail || 'Failed to delete'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">Organizational departments</p>
        <button onClick={() => { setEditing(null); setFormData({ name: '', description: '' }); setFormOpen(true); }}
          className="flex items-center gap-2 bg-brand hover:bg-brand/90 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr><td colSpan="3" className="text-center py-8 text-slate-400 animate-pulse">Loading...</td></tr>
            ) : items.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 transition group">
                <td className="py-3.5 px-4 font-semibold text-slate-900">{d.name}</td>
                <td className="py-3.5 px-4 text-slate-500">{d.description || '—'}</td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setEditing(d); setFormData({ name: d.name, description: d.description || '' }); setFormOpen(true); }}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(d)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan="3" className="text-center py-8 text-slate-400">No departments yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <h3 className="text-base font-bold text-slate-900">{editing ? 'Edit Department' : 'Add Department'}</h3>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="3" className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>
              <div className="border-t pt-4 flex gap-3 mt-4">
                <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand/90 rounded-md shadow-sm transition">
                  {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DesignationsTab() {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', department_id: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [dRes, deptRes] = await Promise.all([designationsApi.getAll(), departmentsApi.getAll()]);
      setItems(dRes.data || []);
      setDepartments(deptRes.data || []);
    } catch { toast.error('Failed to load designations'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      if (editing) { await designationsApi.update(editing.id, formData); toast.success('Designation updated'); }
      else { await designationsApi.create(formData); toast.success('Designation created'); }
      setFormOpen(false); setEditing(null); setFormData({ name: '', department_id: '' }); await load();
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    try { await designationsApi.delete(item.id); toast.success('Deleted'); await load(); }
    catch (error) { toast.error(error.response?.data?.detail || 'Failed to delete'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">Designations (optionally linked to a department)</p>
        <button onClick={() => { setEditing(null); setFormData({ name: '', department_id: '' }); setFormOpen(true); }}
          className="flex items-center gap-2 bg-brand hover:bg-brand/90 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr><td colSpan="3" className="text-center py-8 text-slate-400 animate-pulse">Loading...</td></tr>
            ) : items.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 transition group">
                <td className="py-3.5 px-4 font-semibold text-slate-900">{d.name}</td>
                <td className="py-3.5 px-4 text-slate-500">{deptName(d.department_id)}</td>
                <td className="py-3.5 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setEditing(d); setFormData({ name: d.name, department_id: d.department_id || '' }); setFormOpen(true); }}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(d)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan="3" className="text-center py-8 text-slate-400">No designations yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <h3 className="text-base font-bold text-slate-900">{editing ? 'Edit Designation' : 'Add Designation'}</h3>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Department</label>
                <select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">— None —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="border-t pt-4 flex gap-3 mt-4">
                <button type="button" onClick={() => setFormOpen(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand/90 rounded-md shadow-sm transition">
                  {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DepartmentsDesignations() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Departments & Designations
        </h1>
        <p className="text-xs text-slate-500">Manage the organizational hierarchy</p>
      </div>
      <Tabs defaultValue="departments">
        <TabsList className="mb-4">
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="designations">Designations</TabsTrigger>
        </TabsList>
        <TabsContent value="departments"><DepartmentsTab /></TabsContent>
        <TabsContent value="designations"><DesignationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
