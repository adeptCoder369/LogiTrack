"use client";

import React, { useState, useEffect } from 'react';
import {
  Users, UserCog, Plus, Search, Trash2, Edit2, KeyRound, Lock, Phone, Mail, Building2
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { employeesApi, companiesApi, departmentsApi, designationsApi } from '../lib/api';

const emptyForm = {
  employee_type: 'Internal',
  name: '', employee_id: '', mobile: '', email: '',
  company_id: '', department_id: '', designation_id: '',
  leads_scope: 'All', address: '', city: '', state: '', joined_at: '',
};

function EmployeeList({ employeeType, onEdit, onEnableLogin }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const [emps, comps, depts, desigs] = await Promise.all([
        employeesApi.getAll({ employee_type: employeeType }),
        companiesApi.getAll(),
        departmentsApi.getAll(),
        designationsApi.getAll(),
      ]);
      setEmployees(emps.data || []);
      setCompanies(comps.data || []);
      setDepartments(depts.data || []);
      setDesignations(desigs.data || []);
    } catch {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [employeeType]);

  const companyName = (id) => companies.find((c) => c.id === id)?.name || '—';
  const deptName = (id) => departments.find((d) => d.id === id)?.name || '—';
  const desigName = (id) => designations.find((d) => d.id === id)?.name || '—';

  const filtered = employees.filter((e) =>
    (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.employee_id || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${employeeType.toLowerCase()} employees...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <span className="text-xs text-slate-500">{filtered.length} employees</span>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Login</th>
                <th className="py-3 px-4 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-10 text-slate-400 animate-pulse">Loading...</td></tr>
              ) : filtered.length > 0 ? filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 transition group">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {(emp.name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{emp.name}</p>
                        {emp.employee_id && <p className="text-[10px] text-slate-400 font-mono">{emp.employee_id}</p>}
                        {emp.mobile && <p className="text-[10px] text-slate-400 flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{emp.mobile}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{deptName(emp.department_id)}</td>
                  <td className="py-3.5 px-4 text-slate-600">{desigName(emp.designation_id)}</td>
                  <td className="py-3.5 px-4 text-slate-600">{companyName(emp.company_id)}</td>
                  <td className="py-3.5 px-4">
                    {emp.login_enabled ? (
                      <span className="flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                        <KeyRound className="w-3 h-3" /> Login Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded border border-slate-200">
                        <Lock className="w-3 h-3" /> No Login
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(emp)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {!emp.login_enabled && emp.employee_type === 'Internal' && (
                        <button
                          onClick={() => onEnableLogin(emp)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                          title="Enable Login"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="text-center py-10 text-slate-400">No {employeeType.toLowerCase()} employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Employees() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [tab, setTab] = useState('Internal');

  const [loginModal, setLoginModal] = useState(false);
  const [loginEmployee, setLoginEmployee] = useState(null);
  const [loginData, setLoginData] = useState({ mobile: '', countryCode: '91', role: 'Weightment', email: '' });

  useEffect(() => {
    (async () => {
      try {
        const [c, d, ds] = await Promise.all([companiesApi.getAll(), departmentsApi.getAll(), designationsApi.getAll()]);
        setCompanies(c.data || []);
        setDepartments(d.data || []);
        setDesignations(ds.data || []);
      } catch {}
    })();
  }, []);

  const handleAdd = () => {
    setEditing(null);
    setFormData({ ...emptyForm, employee_type: tab });
    setModalOpen(true);
  };

  const handleEdit = (emp) => {
    setEditing(emp);
    setFormData({
      employee_type: emp.employee_type || 'Internal',
      employee_id: emp.employee_id || '',
      name: emp.name || '',
      mobile: emp.mobile || '',
      email: emp.email || '',
      company_id: emp.company_id || '',
      department_id: emp.department_id || '',
      designation_id: emp.designation_id || '',
      leads_scope: emp.leads_scope || 'All',
      address: emp.address || '',
      city: emp.city || '',
      state: emp.state || '',
      joined_at: emp.joined_at || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await employeesApi.update(editing.id, { ...formData, employee_type: tab });
        toast.success('Employee updated');
      } else {
        await employeesApi.create({ ...formData, employee_type: tab });
        toast.success('Employee created');
      }
      setModalOpen(false);
      setEditing(null);
      setFormData(emptyForm);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleEnableLogin = (emp) => {
    setLoginEmployee(emp);
    setLoginData({ mobile: emp.mobile || '', countryCode: '91', role: 'Weightment', email: emp.email || '' });
    setLoginModal(true);
  };

  const submitEnableLogin = async () => {
    if (!loginData.mobile || loginData.mobile.length !== 10) {
      toast.error('Valid 10-digit mobile required');
      return;
    }
    setSaving(true);
    try {
      await employeesApi.enableLogin(loginEmployee.id, loginData);
      toast.success('Login enabled — user can set password via first-time OTP');
      setLoginModal(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to enable login');
    } finally {
      setSaving(false);
    }
  };

  const triggerRefetch = { current: null };
  const [refetchKey, setRefetchKey] = useState(0);
  const refetch = () => setRefetchKey((k) => k + 1);

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Employees
          </h1>
          <p className="text-xs text-slate-500">Manage internal and external employee records</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 bg-brand hover:bg-brand/90 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition-all"
        >
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="Internal">Internal</TabsTrigger>
          <TabsTrigger value="External">External</TabsTrigger>
        </TabsList>
        <TabsContent value="Internal">
          <EmployeeList key={`internal-${refetchKey}`} employeeType="Internal" onEdit={handleEdit} onEnableLogin={handleEnableLogin} />
        </TabsContent>
        <TabsContent value="External">
          <EmployeeList key={`external-${refetchKey}`} employeeType="External" onEdit={handleEdit} onEnableLogin={handleEnableLogin} />
        </TabsContent>
      </Tabs>

      {/* Create/Edit modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">{editing ? 'Edit Employee' : 'Add Employee'}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">{tab} employee record</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Employee Code</label>
                  <input type="text" value={formData.employee_id} onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono" placeholder="EMP-001" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Mobile</label>
                  <input type="text" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Email</label>
                  <input type="text" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Department</label>
                  <select value={formData.department_id} onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— None —</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Designation</label>
                  <select value={formData.designation_id} onChange={(e) => setFormData({ ...formData, designation_id: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— None —</option>
                    {designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Company</label>
                  <select value={formData.company_id} onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                    className="w-full text-xs p-2.5 border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="">— None —</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {tab === 'Internal' && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Leads Scope</label>
                    <select value={formData.leads_scope} onChange={(e) => setFormData({ ...formData, leads_scope: e.target.value })}
                      className="w-full text-xs p-2.5 border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="All">All</option>
                      <option value="Sales">Sales</option>
                      <option value="Purchase">Purchase</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="border-t pt-4 flex gap-3 mt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-brand hover:bg-brand/90 rounded-md shadow-sm transition">
                  {saving ? 'Saving...' : editing ? 'Save Employee' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enable Login modal */}
      {loginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Enable Login</h2>
                <p className="text-xs text-slate-500">{loginEmployee?.name}</p>
              </div>
              <button onClick={() => setLoginModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-mono p-1">✕</button>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-500">
                Creates a user login for this employee (password_set=false → first-time OTP).
                Mobile must be unique within the tenant.
              </p>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Mobile *</label>
                <input type="text" value={loginData.mobile} onChange={(e) => setLoginData({ ...loginData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="10-digit mobile" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Role</label>
                <select value={loginData.role} onChange={(e) => setLoginData({ ...loginData, role: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                  {['Admin', 'Management', 'Loader', 'Weightment', 'Dispatch Verifier', 'Depot Supervisor', 'Depot Staff'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setLoginModal(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition">Cancel</button>
              <button onClick={submitEnableLogin} disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition">
                {saving ? 'Enabling...' : 'Enable Login'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
