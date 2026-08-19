"use client";

import React, { useState, useEffect } from 'react';
import { BarChart3, Activity, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { usageApi } from '../lib/api';

export default function UsageDashboard() {
  const [summary, setSummary] = useState(null);
  const [logs, setLogs] = useState([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [summaryRes, logsRes] = await Promise.all([
        usageApi.getSummary(days),
        usageApi.getLogs({ days: 7, page: 1, page_size: 20 }),
      ]);
      setSummary(summaryRes.data);
      setLogs(logsRes.data.logs || []);
    } catch {
      toast.error('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [days]);

  const total = summary?.total_requests || 0;
  const byEndpoint = summary?.by_endpoint || {};
  const byDay = summary?.by_day || {};
  const byStatus = summary?.by_status || {};

  const topEndpoints = Object.entries(byEndpoint).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Usage Dashboard
          </h1>
          <p className="text-xs text-slate-500">Per-tenant request volume, endpoints and quota hooks</p>
        </div>
        <select value={days} onChange={(e) => setDays(parseInt(e.target.value, 10))} className="text-xs p-2 border rounded-md bg-white">
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Requests</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '…' : total}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600"><Activity className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg per Day</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '…' : (total / days).toFixed(1)}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600"><Clock className="w-5 h-5" /></div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Endpoints Hit</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{Object.keys(byEndpoint).length}</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600"><BarChart3 className="w-5 h-5" /></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Top Endpoints</h3>
            <div className="space-y-2">
              {topEndpoints.length > 0 ? topEndpoints.map(([path, count]) => (
                <div key={path} className="flex items-center justify-between text-xs bg-slate-50 rounded px-3 py-2">
                  <span className="font-mono text-slate-600 truncate">{path}</span>
                  <span className="font-bold text-slate-900">{count}</span>
                </div>
              )) : <p className="text-xs text-slate-400">No data yet.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-bold text-slate-700 mb-3">Daily Volume</h3>
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
              {Object.entries(byDay).length > 0 ? Object.entries(byDay).sort().map(([day, count]) => (
                <div key={day} className="flex items-center gap-2 text-xs">
                  <span className="w-24 font-mono text-slate-500">{day}</span>
                  <div className="flex-1 bg-slate-100 rounded h-2 overflow-hidden">
                    <div className="bg-blue-500 h-2" style={{ width: `${Math.min(100, (count / Math.max(1, ...Object.values(byDay))) * 100)}%` }} />
                  </div>
                  <span className="w-8 text-right font-semibold">{count}</span>
                </div>
              )) : <p className="text-xs text-slate-400">No data yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Recent Requests</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-[10px] uppercase tracking-wider">
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3">Path</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-500">{(l.created_at || '').slice(0, 19).replace('T', ' ')}</td>
                    <td className="py-2 px-3"><span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">{l.method}</span></td>
                    <td className="py-2 px-3 font-mono text-slate-600 truncate max-w-[300px]">{l.path}</td>
                    <td className="py-2 px-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${l.status_code >= 400 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{l.status_code}</span></td>
                    <td className="py-2 px-3 text-right text-slate-500">{l.duration_ms}ms</td>
                  </tr>
                ))}
                {logs.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-400">No logs in this window.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Retention is 30 days by default (configurable via <code>tenants.feature_flags.max_requests_per_day</code>). Quota hook: <code>GET /usage/quota-check</code></span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
