"use client";

import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Trash2, Eye, Send, Download, FileSpreadsheet, IndianRupee
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { invoicesApi, purchaseOrdersApi, paymentsApi, notesApi } from '../lib/api';

const STATUS_STYLES = {
  'Draft': 'bg-slate-100 text-slate-600 border-slate-200',
  'Issued': 'bg-blue-50 text-blue-700 border-blue-100',
  'Partially Paid': 'bg-amber-50 text-amber-700 border-amber-100',
  'Paid': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Overdue': 'bg-rose-50 text-rose-700 border-rose-100',
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [generateOpen, setGenerateOpen] = useState(false);
  const [pos, setPos] = useState([]);
  const [selectedPo, setSelectedPo] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [generating, setGenerating] = useState(false);

  const [detail, setDetail] = useState(null);       // decorated invoice
  const [payments, setPayments] = useState([]);
  const [allocatePayment, setAllocatePayment] = useState('');
  const [allocateAmount, setAllocateAmount] = useState('');
  const [noteForm, setNoteForm] = useState({ type: 'credit', amount: '', reason: '' });
  const [actioning, setActioning] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await invoicesApi.getAll(statusFilter === 'all' ? undefined : statusFilter);
      setInvoices(res.data || []);
    } catch {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openGenerate = async () => {
    setGenerateOpen(true);
    setSelectedPo('');
    setGstRate('18');
    try {
      const res = await purchaseOrdersApi.getAll();
      setPos(res.data || []);
    } catch {
      toast.error('Failed to load purchase orders');
    }
  };

  const handleGenerate = async () => {
    if (!selectedPo) {
      toast.error('Select a purchase order');
      return;
    }
    setGenerating(true);
    try {
      await invoicesApi.generate(selectedPo, { gst_rate: parseFloat(gstRate) || 0, due_days: 30 });
      toast.success('Invoice generated (Draft)');
      setGenerateOpen(false);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate invoice');
    } finally {
      setGenerating(false);
    }
  };

  const openDetail = async (inv) => {
    try {
      const [detailRes, paymentsRes, creditRes, debitRes] = await Promise.all([
        invoicesApi.getOne(inv.id),
        paymentsApi.getAll(),
        notesApi.getCreditNotes(inv.id),
        notesApi.getDebitNotes(inv.id),
      ]);
      setDetail(detailRes.data);
      setPayments(paymentsRes.data || []);
      setAllocatePayment('');
      setAllocateAmount('');
      setNoteForm({ type: 'credit', amount: '', reason: '' });
    } catch {
      toast.error('Failed to load invoice detail');
    }
  };

  const handleIssue = async () => {
    setActioning(true);
    try {
      await invoicesApi.issue(detail.id);
      toast.success('Invoice issued');
      await openDetail(detail);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to issue');
    } finally {
      setActioning(false);
    }
  };

  const handleAllocate = async () => {
    if (!allocatePayment || !allocateAmount) {
      toast.error('Select a payment and amount');
      return;
    }
    setActioning(true);
    try {
      await invoicesApi.allocate(detail.id, allocatePayment, parseFloat(allocateAmount));
      toast.success('Payment allocated');
      await openDetail(detail);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to allocate');
    } finally {
      setActioning(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteForm.amount) {
      toast.error('Amount is required');
      return;
    }
    setActioning(true);
    try {
      const payload = { invoice_id: detail.id, amount: parseFloat(noteForm.amount), reason: noteForm.reason || null };
      if (noteForm.type === 'credit') {
        await notesApi.createCreditNote(payload);
        toast.success('Credit note added');
      } else {
        await notesApi.createDebitNote(payload);
        toast.success('Debit note added');
      }
      await openDetail(detail);
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add note');
    } finally {
      setActioning(false);
    }
  };

  const handleDelete = async (inv) => {
    if (!confirm(`Delete draft invoice ${inv.invoice_no}?`)) return;
    try {
      await invoicesApi.delete(inv.id);
      toast.success('Invoice deleted');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete');
    }
  };

  const filtered = invoices.filter((inv) =>
    (inv.invoice_no || '').toLowerCase().includes(search.toLowerCase()) ||
    (inv.client_company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    total: invoices.length,
    outstanding: invoices.reduce((s, i) => s + (i.outstanding || 0), 0),
    paid: invoices.reduce((s, i) => s + (i.paid_total || 0), 0),
    overdue: invoices.filter((i) => (i.effective_status || i.status) === 'Overdue').length,
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Invoices
          </h1>
          <p className="text-xs text-slate-500">Generate invoices from POs, reconcile payments and notes</p>
        </div>
        <button
          onClick={openGenerate}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition-all"
        >
          <Plus className="w-4 h-4" /> Generate from PO
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Invoices</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totals.total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600"><FileText className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Outstanding</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">₹{totals.outstanding.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><IndianRupee className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Paid</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">₹{totals.paid.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600"><FileText className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overdue</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{totals.overdue}</p>
            </div>
            <div className="w-10 h-10 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600"><FileText className="w-5 h-5" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="flex bg-white p-3 rounded-lg shadow-sm border items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs p-2 border rounded-md bg-white">
          <option value="all">All statuses</option>
          {['Draft', 'Issued', 'Partially Paid', 'Paid', 'Overdue'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Invoice</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Billing</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400 animate-pulse">Loading...</td></tr>
              ) : filtered.length > 0 ? filtered.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50 transition group">
                  <td className="py-3.5 px-4">
                    <p className="font-mono font-bold text-slate-900">{inv.invoice_no}</p>
                    <p className="text-[10px] text-slate-400">{inv.po_number ? `PO ${inv.po_number}` : ''}{inv.invoice_date ? ` • ${inv.invoice_date}` : ''}</p>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700">{inv.client_company_name || '—'}</td>
                  <td className="py-3.5 px-4 text-slate-600">{inv.billing_company_name || '—'}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${STATUS_STYLES[inv.effective_status || inv.status] || STATUS_STYLES.Draft}`}>
                      {inv.effective_status || inv.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-semibold text-slate-900">₹{inv.total_amount}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-rose-600">₹{inv.outstanding || 0}</td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openDetail(inv)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Details">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <a href={invoicesApi.exportPdf(inv.id)} target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition" title="PDF">
                        <FileText className="w-3.5 h-3.5" />
                      </a>
                      <a href={invoicesApi.exportExcel(inv.id)} target="_blank" rel="noreferrer" className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition" title="Excel">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                      </a>
                      {inv.status === 'Draft' && (
                        <button onClick={() => handleDelete(inv)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition" title="Delete draft">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="7" className="text-center py-10 text-slate-400">No invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate modal */}
      {generateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Generate Invoice</h2>
                <p className="text-xs text-slate-500">From a purchase order (Draft)</p>
              </div>
              <button onClick={() => setGenerateOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-mono p-1">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Purchase Order *</label>
                <select value={selectedPo} onChange={(e) => setSelectedPo(e.target.value)} className="w-full text-xs p-2.5 border rounded bg-white">
                  <option value="">Select PO</option>
                  {pos.map((po) => (
                    <option key={po.id} value={po.id}>
                      {po.po_number} — {po.product_name} ({po.dispatched_quantity_mt || po.total_quantity_mt} MT) — {po.to_company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">GST Rate (%)</label>
                <input type="number" step="0.01" value={gstRate} onChange={(e) => setGstRate(e.target.value)} className="w-full text-xs p-2.5 border rounded" />
              </div>
              <p className="text-xs text-slate-500">Line rate resolves from company pricing (0 if none — editable on the draft). Qty = dispatched, else PO total.</p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setGenerateOpen(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition">Cancel</button>
              <button onClick={handleGenerate} disabled={generating} className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition">
                {generating ? 'Generating...' : 'Generate Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{detail.invoice_no}</h2>
                <p className="text-xs text-slate-500">
                  {detail.client_company_name}{detail.billing_company_name && detail.billing_company_name !== detail.client_company_name ? ` • billing: ${detail.billing_company_name}` : ''}{detail.source_name ? ` • source: ${detail.source_name}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a href={invoicesApi.exportPdf(detail.id)} target="_blank" rel="noreferrer" className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center gap-1"><Download className="w-3 h-3" />PDF</a>
                <a href={invoicesApi.exportExcel(detail.id)} target="_blank" rel="noreferrer" className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded flex items-center gap-1"><FileSpreadsheet className="w-3 h-3" />Excel</a>
                {detail.status === 'Draft' && (
                  <button onClick={handleIssue} disabled={actioning} className="px-2 py-1 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded flex items-center gap-1"><Send className="w-3 h-3" />Issue</button>
                )}
                <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-600 text-xl font-mono p-1">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] text-slate-400 uppercase">Status</p><p className="font-bold text-slate-900">{detail.effective_status || detail.status}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] text-slate-400 uppercase">Total</p><p className="font-bold text-slate-900">₹{detail.total_amount}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] text-slate-400 uppercase">Paid</p><p className="font-bold text-emerald-600">₹{detail.paid_total}</p></div>
                <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] text-slate-400 uppercase">Outstanding</p><p className="font-bold text-rose-600">₹{detail.outstanding}</p></div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-2">Items</h3>
                <div className="bg-white rounded-lg border overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider">
                        <th className="py-2 px-3">Product</th>
                        <th className="py-2 px-3 text-right">Qty (MT)</th>
                        <th className="py-2 px-3 text-right">Rate</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(detail.items || []).map((item) => (
                        <tr key={item.id}>
                          <td className="py-2 px-3 font-medium">{item.product_name}</td>
                          <td className="py-2 px-3 text-right">{item.quantity_mt}</td>
                          <td className="py-2 px-3 text-right">₹{item.rate}</td>
                          <td className="py-2 px-3 text-right font-semibold">₹{item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-right text-xs space-y-0.5 mt-2">
                  <p>Subtotal: ₹{detail.subtotal}</p>
                  <p>GST ({detail.gst_rate}%): ₹{detail.gst_amount}</p>
                  <p className="font-bold text-sm">Total: ₹{detail.total_amount}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-2">Payments & Allocation</h3>
                  <div className="space-y-1.5 mb-3">
                    {(detail.payments || []).map((alloc) => (
                      <div key={alloc.id} className="flex items-center gap-2 bg-slate-50 rounded px-3 py-1.5 text-xs">
                        <span className="font-mono font-bold text-emerald-700">₹{alloc.amount_allocated}</span>
                        <span className="text-slate-500">{alloc.payment?.receipt_no || alloc.payment_id}</span>
                        <span className="text-slate-400">{alloc.payment?.mode}</span>
                      </div>
                    ))}
                    {(detail.payments || []).length === 0 && <p className="text-xs text-slate-400">No allocations yet.</p>}
                  </div>
                  {detail.status !== 'Draft' && detail.status !== 'Paid' && (
                    <div className="flex gap-2">
                      <select value={allocatePayment} onChange={(e) => setAllocatePayment(e.target.value)} className="flex-1 text-xs p-2 border rounded bg-white">
                        <option value="">Select payment</option>
                        {payments.filter((p) => (p.unallocated || 0) > 0).map((p) => (
                          <option key={p.id} value={p.id}>{p.receipt_no} — ₹{p.unallocated} unallocated</option>
                        ))}
                      </select>
                      <input type="number" step="0.01" value={allocateAmount} onChange={(e) => setAllocateAmount(e.target.value)} placeholder="Amount" className="w-24 text-xs p-2 border rounded" />
                      <button onClick={handleAllocate} disabled={actioning} className="px-3 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded">Allocate</button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-2">Notes (Credit / Debit)</h3>
                  <div className="space-y-1.5 mb-3">
                    {(detail.credit_notes || []).map((n) => (
                      <div key={n.id} className="flex items-center gap-2 bg-emerald-50 rounded px-3 py-1.5 text-xs">
                        <span className="font-mono font-bold text-emerald-700">−₹{n.amount}</span>
                        <span className="font-mono text-slate-500">{n.note_no}</span>
                        <span className="text-slate-400 flex-1 truncate">{n.reason || ''}</span>
                      </div>
                    ))}
                    {(detail.debit_notes || []).map((n) => (
                      <div key={n.id} className="flex items-center gap-2 bg-rose-50 rounded px-3 py-1.5 text-xs">
                        <span className="font-mono font-bold text-rose-700">+₹{n.amount}</span>
                        <span className="font-mono text-slate-500">{n.note_no}</span>
                        <span className="text-slate-400 flex-1 truncate">{n.reason || ''}</span>
                      </div>
                    ))}
                    {(detail.credit_notes || []).length === 0 && (detail.debit_notes || []).length === 0 && (
                      <p className="text-xs text-slate-400">No notes yet.</p>
                    )}
                  </div>
                  {detail.status !== 'Draft' && (
                    <div className="flex gap-2">
                      <select value={noteForm.type} onChange={(e) => setNoteForm({ ...noteForm, type: e.target.value })} className="text-xs p-2 border rounded bg-white">
                        <option value="credit">Credit</option>
                        <option value="debit">Debit</option>
                      </select>
                      <input type="number" step="0.01" value={noteForm.amount} onChange={(e) => setNoteForm({ ...noteForm, amount: e.target.value })} placeholder="Amount" className="w-24 text-xs p-2 border rounded" />
                      <input type="text" value={noteForm.reason} onChange={(e) => setNoteForm({ ...noteForm, reason: e.target.value })} placeholder="Reason" className="flex-1 text-xs p-2 border rounded" />
                      <button onClick={handleAddNote} disabled={actioning} className="px-3 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded">Add</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
