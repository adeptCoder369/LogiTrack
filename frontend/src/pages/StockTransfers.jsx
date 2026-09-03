"use client";

import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Plus, Search, Eye, Send, CheckCircle, XCircle, Truck, Package, Clock, FileSpreadsheet, Settings } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { stockTransfersApi, approvalMatricesApi, productsApi, depotsApi, companiesApi, sourcesApi } from '../lib/api';

const STATUS_STYLES = {
  Requested: 'bg-amber-50 text-amber-700 border-amber-100',
  Approved: 'bg-blue-50 text-blue-700 border-blue-100',
  Dispatched: 'bg-purple-50 text-purple-700 border-purple-100',
  Received: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-100',
  Cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

const emptyTransferForm = {
  product_id: '',
  quantity_mt: '',
  from_type: 'Depot',
  from_id: '',
  to_type: 'Depot',
  to_id: '',
  request_notes: '',
};

const emptyMatrixForm = {
  product_id: '',
  amount_threshold: '',
  approver_roles: '',
};

function TransfersTab() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState(emptyTransferForm);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState([]);
  const [sources, setSources] = useState([]);
  const [detail, setDetail] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await stockTransfersApi.getAll(statusFilter === 'all' ? {} : { status: statusFilter });
      setTransfers(res.data || []);
    } catch {
      toast.error('Failed to load transfers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  useEffect(() => {
    (async () => {
      try {
        const [prods, srcs] = await Promise.all([productsApi.getAll(), sourcesApi.getAll()]);
        setProducts(prods.data || []);
        setSources(srcs.data || []);
      } catch {}
    })();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.product_id || !formData.quantity_mt || !formData.from_id || !formData.to_id) {
      toast.error('Product, quantity, source and destination are required');
      return;
    }
    setSaving(true);
    try {
      await stockTransfersApi.create({ ...formData, quantity_mt: parseFloat(formData.quantity_mt) });
      toast.success('Transfer requested');
      setShowCreate(false);
      setFormData(emptyTransferForm);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create transfer');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (tr) => {
    try {
      const res = await stockTransfersApi.getOne(tr.id);
      setDetail(res.data);
      setActionNotes('');
    } catch {
      toast.error('Failed to load detail');
    }
  };

  const doAction = async (action) => {
    const notes = actionNotes || undefined;
    const fnMap = {
      approve: () => stockTransfersApi.approve(detail.id, notes),
      dispatch: () => stockTransfersApi.dispatch(detail.id, notes),
      receive: () => stockTransfersApi.receive(detail.id, notes),
      reject: () => stockTransfersApi.reject(detail.id, notes),
      cancel: () => stockTransfersApi.cancel(detail.id, notes),
    };
    if (action === 'reject' && !notes) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      await fnMap[action]();
      toast.success(`Transfer ${action}d`);
      await openDetail(detail);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action}`);
    }
  };

  const filtered = transfers.filter((t) =>
    (t.transfer_no || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.product_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const status = detail?.status;
  const canApprove = status === 'Requested';
  const canDispatch = status === 'Approved';
  const canReceive = status === 'Dispatched';
  const canReject = status === 'Requested' || status === 'Approved';
  const canCancel = status === 'Requested' || status === 'Approved';

  const sourcesByType = (type) => sources.filter((s) => s.type === type);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">Inter-depot / inter-company transfers with audit trail.</p>
        <div className="flex gap-2">
          <a href={stockTransfersApi.exportLedger()} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-white border rounded hover:bg-slate-50">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export
          </a>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-brand hover:bg-brand/90 text-white font-medium text-xs px-4 py-2 rounded-lg shadow">
            <Plus className="w-4 h-4" /> Request Transfer
          </button>
        </div>
      </div>

      <div className="flex bg-white p-3 rounded-lg shadow-sm border items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Search transfers..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs p-2 border rounded-md bg-white">
          <option value="all">All statuses</option>
          {Object.keys(STATUS_STYLES).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Transfer</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">From</th>
                <th className="py-3 px-4">To</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400 animate-pulse">Loading...</td></tr>
              ) : filtered.length > 0 ? filtered.map((tr) => (
                <tr key={tr.id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{tr.transfer_no}</td>
                  <td className="py-3.5 px-4 text-slate-700">{tr.product_name}</td>
                  <td className="py-3.5 px-4 text-slate-600">{tr.from_type} {tr.from_name}</td>
                  <td className="py-3.5 px-4 text-slate-600">{tr.to_type} {tr.to_name}</td>
                  <td className="py-3.5 px-4 text-right font-semibold">{tr.quantity_mt} MT</td>
                  <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${STATUS_STYLES[tr.status] || ''}`}>{tr.status}</span></td>
                  <td className="py-3.5 px-4 text-center">
                    <button onClick={() => openDetail(tr)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="Details"><Eye className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400">No transfers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <h3 className="text-base font-bold text-slate-900">Request Transfer</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1">✕</button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 flex-1">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Product *</label>
                <select value={formData.product_id} onChange={(e) => setFormData({ ...formData, product_id: e.target.value })} className="w-full text-xs p-2.5 border rounded bg-white">
                  <option value="">Select product</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Quantity (MT) *</label>
                <input type="number" step="0.001" value={formData.quantity_mt} onChange={(e) => setFormData({ ...formData, quantity_mt: e.target.value })} className="w-full text-xs p-2.5 border rounded" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">From Type</label>
                  <select value={formData.from_type} onChange={(e) => setFormData({ ...formData, from_type: e.target.value, from_id: '' })} className="w-full text-xs p-2.5 border rounded bg-white">
                    <option value="Depot">Depot</option>
                    <option value="Company">Company</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">From *</label>
                  <select value={formData.from_id} onChange={(e) => setFormData({ ...formData, from_id: e.target.value })} className="w-full text-xs p-2.5 border rounded bg-white">
                    <option value="">Select source</option>
                    {sourcesByType(formData.from_type).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">To Type</label>
                  <select value={formData.to_type} onChange={(e) => setFormData({ ...formData, to_type: e.target.value, to_id: '' })} className="w-full text-xs p-2.5 border rounded bg-white">
                    <option value="Depot">Depot</option>
                    <option value="Company">Company</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">To *</label>
                  <select value={formData.to_id} onChange={(e) => setFormData({ ...formData, to_id: e.target.value })} className="w-full text-xs p-2.5 border rounded bg-white">
                    <option value="">Select destination</option>
                    {sourcesByType(formData.to_type).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Notes</label>
                <textarea value={formData.request_notes} onChange={(e) => setFormData({ ...formData, request_notes: e.target.value })} rows="2" className="w-full text-xs p-2.5 border rounded resize-none" />
              </div>
              <div className="border-t pt-4 flex gap-3">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand/90 rounded-md shadow-sm">{saving ? 'Requesting...' : 'Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{detail.transfer_no} — {detail.product_name}</h2>
                <p className="text-xs text-slate-500">{detail.from_type} {detail.from_name} → {detail.to_type} {detail.to_name} • {detail.quantity_mt} MT</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${STATUS_STYLES[detail.status] || ''}`}>{detail.status}</span>
                <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600 text-xl font-mono p-1">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 rounded p-3"><p className="text-[10px] text-slate-400 uppercase">Requested By</p><p className="font-semibold">{detail.requested_by_name || '—'}</p></div>
                <div className="bg-slate-50 rounded p-3"><p className="text-[10px] text-slate-400 uppercase">Approved By</p><p className="font-semibold">{detail.approved_by_name || '—'}</p></div>
                <div className="bg-slate-50 rounded p-3"><p className="text-[10px] text-slate-400 uppercase">Dispatched By</p><p className="font-semibold">{detail.dispatched_by_name || '—'}</p></div>
                <div className="bg-slate-50 rounded p-3"><p className="text-[10px] text-slate-400 uppercase">Received By</p><p className="font-semibold">{detail.received_by_name || '—'}</p></div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Audit Timeline</h3>
                <div className="space-y-2">
                  {(detail.audit || []).map((a) => (
                    <div key={a.id} className="flex gap-3 text-xs bg-slate-50 rounded px-3 py-2">
                      <span className="font-mono font-bold text-slate-700">{a.event}</span>
                      <span className="text-slate-500">{a.actor_name || 'system'}</span>
                      <span className="text-slate-400 ml-auto">{a.created_at?.slice(0, 19).replace('T', ' ')}</span>
                    </div>
                  ))}
                  {(detail.audit || []).length === 0 && <p className="text-xs text-slate-400">No audit entries.</p>}
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Action Notes</label>
                <textarea value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} rows="2" placeholder="Optional notes for this action..." className="w-full text-xs p-2.5 border rounded resize-none" />
                <div className="flex flex-wrap gap-2 mt-3">
                  {canApprove && <button onClick={() => doAction('approve')} className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Approve</button>}
                  {canReject && <button onClick={() => doAction('reject')} className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded flex items-center gap-1"><XCircle className="w-3.5 h-3.5" />Reject</button>}
                  {canDispatch && <button onClick={() => doAction('dispatch')} className="px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded flex items-center gap-1"><Truck className="w-3.5 h-3.5" />Dispatch</button>}
                  {canReceive && <button onClick={() => doAction('receive')} className="px-3 py-1.5 text-xs font-bold bg-brand hover:bg-brand/90 text-white rounded flex items-center gap-1"><Package className="w-3.5 h-3.5" />Receive</button>}
                  {canCancel && <button onClick={() => doAction('cancel')} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 rounded border">Cancel</button>}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Locked qty is reserved at request; on receive the stock moves atomically.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalTab() {
  const [matrices, setMatrices] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState(emptyMatrixForm);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [mRes, pRes] = await Promise.all([approvalMatricesApi.getAll(), productsApi.getAll()]);
      setMatrices(mRes.data || []);
      setProducts(pRes.data || []);
    } catch {
      toast.error('Failed to load approval matrices');
    }
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.approver_roles) {
      toast.error('Approver roles are required (comma-separated)');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        product_id: formData.product_id || null,
        amount_threshold: formData.amount_threshold ? parseFloat(formData.amount_threshold) : null,
        approver_roles: formData.approver_roles.split(',').map((r) => r.trim()).filter(Boolean),
      };
      if (editing) {
        await approvalMatricesApi.update(editing.id, payload);
        toast.success('Matrix updated');
      } else {
        await approvalMatricesApi.create(payload);
        toast.success('Matrix created');
      }
      setEditing(null);
      setFormData(emptyMatrixForm);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m) => {
    if (!confirm('Delete this approval matrix?')) return;
    try {
      await approvalMatricesApi.delete(m.id);
      toast.success('Deleted');
      await load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          Approval matrices gate the <strong>Approve</strong> action. Most specific match wins (product-specific, then highest amount threshold). No matrices = any approver role can approve.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Product (optional)</label>
          <select value={formData.product_id} onChange={(e) => setFormData({ ...formData, product_id: e.target.value })} className="w-full text-xs p-2.5 border rounded bg-white">
            <option value="">All products</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.product_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Amount Threshold (MT)</label>
          <input type="number" step="0.01" value={formData.amount_threshold} onChange={(e) => setFormData({ ...formData, amount_threshold: e.target.value })} className="w-full text-xs p-2.5 border rounded" placeholder="e.g. 100" />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Approver Roles *</label>
          <input type="text" value={formData.approver_roles} onChange={(e) => setFormData({ ...formData, approver_roles: e.target.value })} className="w-full text-xs p-2.5 border rounded font-mono" placeholder="Management, Admin" />
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand/90 rounded-md">
            {saving ? 'Saving...' : editing ? 'Update' : 'Add Rule'}
          </button>
          {editing && <button type="button" onClick={() => { setEditing(null); setFormData(emptyMatrixForm); }} className="px-3 py-2 text-xs font-semibold bg-slate-100 rounded">Cancel</button>}
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">Threshold</th>
              <th className="py-3 px-4">Approver Roles</th>
              <th className="py-3 px-4 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {matrices.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="py-3 px-4">{m.product_id ? (products.find((p) => p.id === m.product_id)?.product_name || m.product_id) : 'All'}</td>
                <td className="py-3 px-4">{m.amount_threshold ?? '—'}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(m.approver_roles) ? m.approver_roles : []).map((r) => (
                      <span key={r} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">{r}</span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => { setEditing(m); setFormData({ product_id: m.product_id || '', amount_threshold: m.amount_threshold?.toString() || '', approver_roles: (m.approver_roles || []).join(', ') }); }} className="p-1.5 text-slate-500 hover:text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(m)} className="p-1.5 text-slate-500 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {matrices.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-slate-400">No approval rules yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StockTransfers() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="w-5 h-5 text-slate-500" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Stock Transfers</h1>
      </div>
      <p className="text-xs text-slate-500 -mt-4">Request → Approve → Dispatch → Receive, with audit trail and inventory locks.</p>
      <Tabs defaultValue="transfers">
        <TabsList className="mb-4">
          <TabsTrigger value="transfers">Transfers</TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-1"><Settings className="w-3.5 h-3.5" />Approval Rules</TabsTrigger>
        </TabsList>
        <TabsContent value="transfers"><TransfersTab /></TabsContent>
        <TabsContent value="approvals"><ApprovalTab /></TabsContent>
      </Tabs>
    </div>
  );
}
