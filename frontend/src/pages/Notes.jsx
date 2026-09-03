"use client";

import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { notesApi, invoicesApi } from '../lib/api';

const emptyForm = { invoice_id: '', amount: '', reason: '' };

function NotesTab({ type }) {
  const [notes, setNotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = type === 'credit' ? await notesApi.getCreditNotes() : await notesApi.getDebitNotes();
      setNotes(res.data || []);
    } catch {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    (async () => {
      try {
        const res = await invoicesApi.getAll();
        setInvoices(res.data || []);
      } catch {}
    })();
  }, [type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.invoice_id || !formData.amount) {
      toast.error('Invoice and amount are required');
      return;
    }
    setSaving(true);
    try {
      const payload = { invoice_id: formData.invoice_id, amount: parseFloat(formData.amount), reason: formData.reason || null };
      if (type === 'credit') {
        await notesApi.createCreditNote(payload);
        toast.success('Credit note created');
      } else {
        await notesApi.createDebitNote(payload);
        toast.success('Debit note created');
      }
      setModalOpen(false);
      setFormData(emptyForm);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (note) => {
    if (!confirm(`Delete ${note.note_no}?`)) return;
    try {
      if (type === 'credit') {
        await notesApi.deleteCreditNote(note.id);
      } else {
        await notesApi.deleteDebitNote(note.id);
      }
      toast.success('Note deleted');
      await load();
    } catch {
      toast.error('Failed to delete note');
    }
  };

  const filtered = notes.filter((n) =>
    (n.note_no || '').toLowerCase().includes(search.toLowerCase()) ||
    (n.reason || '').toLowerCase().includes(search.toLowerCase())
  );

  const invoiceNo = (id) => invoices.find((i) => i.id === id)?.invoice_no || id;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">
          {type === 'credit' ? 'Credit notes reduce an invoice\u2019s outstanding.' : 'Debit notes are recorded adjustments on an invoice.'}
        </p>
        <button onClick={() => { setFormData(emptyForm); setModalOpen(true); }}
          className="flex items-center gap-2 bg-brand hover:bg-brand/90 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition">
          <Plus className="w-4 h-4" /> Add {type === 'credit' ? 'Credit' : 'Debit'} Note
        </button>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs pl-9 pr-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Note</th>
              <th className="py-3 px-4">Invoice</th>
              <th className="py-3 px-4">Reason</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 text-center w-16">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {loading ? (
              <tr><td colSpan="5" className="text-center py-10 text-slate-400 animate-pulse">Loading...</td></tr>
            ) : filtered.length > 0 ? filtered.map((n) => (
              <tr key={n.id} className="hover:bg-slate-50 transition group">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{n.note_no}</td>
                <td className="py-3.5 px-4 text-slate-600">{invoiceNo(n.invoice_id)}</td>
                <td className="py-3.5 px-4 text-slate-500">{n.reason || '—'}</td>
                <td className={`py-3.5 px-4 text-right font-bold ${type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {type === 'credit' ? '−' : '+'}₹{n.amount}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <button onClick={() => handleDelete(n)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="text-center py-10 text-slate-400">No notes found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <h3 className="text-base font-bold text-slate-900">Add {type === 'credit' ? 'Credit' : 'Debit'} Note</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Invoice *</label>
                <select value={formData.invoice_id} onChange={(e) => setFormData({ ...formData, invoice_id: e.target.value })} className="w-full text-xs p-2.5 border rounded bg-white">
                  <option value="">Select invoice</option>
                  {invoices.filter((i) => i.status !== 'Draft').map((i) => (
                    <option key={i.id} value={i.id}>{i.invoice_no} — {i.client_company_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Amount *</label>
                <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full text-xs p-2.5 border rounded" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Reason</label>
                <textarea rows="3" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full text-xs p-2.5 border rounded resize-none" />
              </div>
              <div className="border-t pt-4 flex gap-3 mt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand/90 rounded-md shadow-sm transition">
                  {saving ? 'Saving...' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Notes() {
  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-slate-500" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
          Credit & Debit Notes
        </h1>
      </div>
      <p className="text-xs text-slate-500 -mt-4">Invoice adjustments — credit notes lower what the client owes</p>
      <Tabs defaultValue="credit">
        <TabsList className="mb-4">
          <TabsTrigger value="credit" className="flex items-center gap-1"><ArrowDownCircle className="w-3.5 h-3.5" />Credit Notes</TabsTrigger>
          <TabsTrigger value="debit" className="flex items-center gap-1"><ArrowUpCircle className="w-3.5 h-3.5" />Debit Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="credit"><NotesTab type="credit" /></TabsContent>
        <TabsContent value="debit"><NotesTab type="debit" /></TabsContent>
      </Tabs>
    </div>
  );
}
