"use client";

import React, { useState, useEffect } from 'react';
import { IndianRupee, Plus, Search, Trash2, Landmark } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { paymentsApi, companiesApi } from '../lib/api';

const MODES = ['Bank Transfer', 'Cheque', 'Cash', 'UPI', 'Other'];
const emptyForm = { company_id: '', amount: '', mode: 'Bank Transfer', bank_ref: '', payment_date: '', notes: '' };

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.getAll();
      setPayments(res.data || []);
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    (async () => {
      try {
        const res = await companiesApi.getAll();
        setCompanies(res.data || []);
      } catch {}
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.company_id || !formData.amount) {
      toast.error('Company and amount are required');
      return;
    }
    setSaving(true);
    try {
      await paymentsApi.create({ ...formData, amount: parseFloat(formData.amount) });
      toast.success('Payment recorded');
      setModalOpen(false);
      setFormData(emptyForm);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (payment) => {
    if (!confirm(`Delete payment ${payment.receipt_no}? Allocations are removed and invoice statuses refresh.`)) return;
    try {
      await paymentsApi.delete(payment.id);
      toast.success('Payment deleted');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const filtered = payments.filter((p) =>
    (p.receipt_no || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.bank_ref || '').toLowerCase().includes(search.toLowerCase())
  );

  const companyName = (id) => companies.find((c) => c.id === id)?.name || id;

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Payments
          </h1>
          <p className="text-xs text-slate-500">Record receipts and reconcile them against invoices</p>
        </div>
        <button
          onClick={() => { setFormData(emptyForm); setModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-brand hover:bg-brand/90 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition-all"
        >
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Payments</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{payments.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600"><Landmark className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Received</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">₹{payments.reduce((s, p) => s + (p.amount || 0), 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><IndianRupee className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Unallocated</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">₹{payments.reduce((s, p) => s + (p.unallocated || 0), 0).toLocaleString('en-IN')}</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600"><IndianRupee className="w-5 h-5" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex bg-white p-3 rounded-lg shadow-sm border items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search receipts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
        <span className="text-xs text-slate-500">{filtered.length} payments</span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Receipt</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Bank Ref</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Unallocated</th>
                <th className="py-3 px-4 text-center w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-10 text-slate-400 animate-pulse">Loading...</td></tr>
              ) : filtered.length > 0 ? filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition group">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.receipt_no}</td>
                  <td className="py-3.5 px-4 text-slate-700">{companyName(p.company_id)}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">{p.mode}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">{p.bank_ref || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-600">{p.payment_date || '—'}</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900">₹{p.amount}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-amber-600">₹{p.unallocated || 0}</td>
                  <td className="py-3.5 px-4 text-center">
                    <button onClick={() => handleDelete(p)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="8" className="text-center py-10 text-slate-400">No payments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Payment</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Receipt against a company</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Company *</label>
                <select value={formData.company_id} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })} className="w-full text-xs p-2.5 border rounded bg-white">
                  <option value="">Select company</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Amount *</label>
                  <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full text-xs p-2.5 border rounded" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Mode</label>
                  <select value={formData.mode} onChange={(e) => setFormData({ ...formData, mode: e.target.value })} className="w-full text-xs p-2.5 border rounded bg-white">
                    {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Bank Ref</label>
                  <input type="text" value={formData.bank_ref} onChange={(e) => setFormData({ ...formData, bank_ref: e.target.value })} className="w-full text-xs p-2.5 border rounded" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Date</label>
                  <input type="date" value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} className="w-full text-xs p-2.5 border rounded" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Notes</label>
                <textarea rows="2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full text-xs p-2.5 border rounded resize-none" />
              </div>
              <div className="border-t pt-4 flex gap-3 mt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand/90 rounded-md shadow-sm transition">
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
