"use client";

import React, { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, Plus, RefreshCw } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { billingApi, tenantApi } from '../lib/api';
import { useAuth } from '../lib/auth';

const PLANS = ['free', 'starter', 'pro', 'enterprise'];
const PROVIDERS = ['stripe', 'paypal'];

export default function Billing() {
  const { user } = useAuth();
  const isPlatform = !!user?.is_master_admin;
  const [subscriptions, setSubscriptions] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ tenant_id: '', plan: 'pro', provider: 'stripe', status: 'active' });
  const [saving, setSaving] = useState(false);
  const [webhookPayload, setWebhookPayload] = useState('{"type":"invoice.paid","data":{"object":{"id":"sub_test","status":"active"}}}');

  const load = async () => {
    setLoading(true);
    try {
      if (isPlatform) {
        const [subs, tenantsRes] = await Promise.all([billingApi.listSubscriptions(), tenantApi.getAll()]);
        setSubscriptions(subs.data || []);
        setTenants(tenantsRes.data || []);
      } else {
        const tenantId = user?.tenant_id;
        if (tenantId) {
          const sub = await billingApi.getSubscription(tenantId);
          setSubscriptions(sub.data ? [sub.data] : []);
        }
      }
    } catch {
      toast.error('Failed to load billing');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleUpsert = async (e) => {
    e.preventDefault();
    if (!form.tenant_id || !form.plan) {
      toast.error('Tenant and plan are required');
      return;
    }
    setSaving(true);
    try {
      await billingApi.upsertSubscription(form);
      toast.success('Subscription saved (tenants.subscription_plan synced)');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async (tenantId) => {
    try {
      const res = await billingApi.createCheckout(tenantId, form.plan, form.provider);
      toast.success(`Checkout stub: ${res.data.checkout_url}`);
      window.open(res.data.checkout_url, '_blank');
    } catch {
      toast.error('Checkout stub failed');
    }
  };

  const handleWebhookTest = async () => {
    try {
      const payload = JSON.parse(webhookPayload);
      const res = await billingApi.webhook(form.provider, payload);
      toast.success(`Webhook stub received: ${res.data.event_type}`);
    } catch (error) {
      toast.error('Invalid JSON or webhook failed');
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-slate-500" />
        <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Billing</h1>
        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold">STUB</span>
      </div>
      <p className="text-xs text-slate-500 -mt-4">Stripe/PayPal stubs — no real SDK calls. Webhook: <code>POST /api/v1/billing/webhook/{'{provider}'}</code></p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Subscriptions</p>
            <p className="text-2xl font-bold mt-1">{subscriptions.length}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Providers</p>
            <p className="text-sm font-mono mt-1">stripe, paypal (stub)</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Tenants plan sync</p>
            <p className="text-xs mt-1">subscriptions.plan ↔ tenants.subscription_plan</p>
          </CardContent>
        </Card>
      </div>

      {isPlatform && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Upsert Subscription (platform only)</h3>
            <form onSubmit={handleUpsert} className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <select value={form.tenant_id} onChange={(e) => setForm({ ...form, tenant_id: e.target.value })} className="text-xs p-2.5 border rounded bg-white">
                <option value="">Tenant *</option>
                {tenants.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}
              </select>
              <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className="text-xs p-2.5 border rounded bg-white">
                {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="text-xs p-2.5 border rounded bg-white">
                {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="text-xs p-2.5 border rounded bg-white">
                <option value="active">active</option>
                <option value="past_due">past_due</option>
                <option value="canceled">canceled</option>
                <option value="trialing">trialing</option>
              </select>
              <button type="submit" disabled={saving} className="py-2 text-xs font-semibold text-white bg-brand hover:bg-brand/90 rounded-md">{saving ? 'Saving...' : 'Save'}</button>
            </form>
            <div className="flex gap-2 mt-3">
              <button onClick={() => form.tenant_id && handleCheckout(form.tenant_id)} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-900 text-white rounded hover:bg-slate-800">
                <ExternalLink className="w-3 h-3" /> Checkout stub
              </button>
              <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white border rounded hover:bg-slate-50">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Webhook Test Stub</h3>
          <textarea value={webhookPayload} onChange={(e) => setWebhookPayload(e.target.value)} rows={4} className="w-full text-xs p-2.5 border rounded font-mono bg-slate-50" />
          <div className="flex gap-2 mt-2">
            <button onClick={handleWebhookTest} className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800">POST /billing/webhook/{form.provider}</button>
            <span className="text-[10px] text-slate-400 py-1">Logs to billing_events, updates subscription status when provider_subscription_id matches.</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3">Tenant</th>
                  <th className="py-2 px-3">Plan</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Provider</th>
                  <th className="py-2 px-3">Provider Sub ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-8 text-slate-400 animate-pulse">Loading...</td></tr>
                ) : subscriptions.length > 0 ? subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-600">{s.tenant_id.slice(0, 8)}…</td>
                    <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold">{s.plan}</span></td>
                    <td className="py-2 px-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span></td>
                    <td className="py-2 px-3 text-slate-500">{s.provider || '—'}</td>
                    <td className="py-2 px-3 font-mono text-slate-400 truncate max-w-[180px]">{s.provider_subscription_id || '—'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" className="text-center py-8 text-slate-400">No subscriptions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
