"use client";

import React, { useState, useEffect } from 'react';
import {
  Map,
  Layers,
  Plus,
  Search,
  Trash2,
  Edit2,
  Globe,
  Warehouse,
  Package
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { regionsApi, locationsApi } from '../lib/api';
import { useAuth } from '../lib/auth';

const emptyRegionForm = { name: '', code: '' };
const emptyLocationForm = { name: '', region_id: '', city: '', state: '' };

function RegionsTab({ regions, loadRegions, canWrite }) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyRegionForm);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Region name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await regionsApi.update(editing.id, formData);
        toast.success('Region updated');
      } else {
        await regionsApi.create(formData);
        toast.success('Region created');
      }
      setShowSidebar(false);
      setFormData(emptyRegionForm);
      setEditing(null);
      await loadRegions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save region');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (region) => {
    if (!confirm(`Delete region "${region.name}"? Locations under it must be moved or deleted first.`)) return;
    try {
      await regionsApi.delete(region.id);
      toast.success('Region deleted');
      await loadRegions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete region');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">Regions group locations (Region → Location → Depot).</p>
        {canWrite && (
          <button
            onClick={() => { setEditing(null); setFormData(emptyRegionForm); setShowSidebar(true); }}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition"
          >
            <Plus className="w-4 h-4" /> Add Region
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Region</th>
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {regions.map((region) => (
              <tr key={region.id} className="hover:bg-slate-50 transition group">
                <td className="py-3.5 px-4 font-semibold text-slate-900">{region.name}</td>
                <td className="py-3.5 px-4 font-mono text-slate-600">{region.code || '—'}</td>
                <td className="py-3.5 px-4 text-center">
                  {canWrite && (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setEditing(region); setFormData({ name: region.name || '', code: region.code || '' }); setShowSidebar(true); }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit Region"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(region)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete Region"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {regions.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center py-12 text-slate-400">No regions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showSidebar && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">{editing ? 'Modify Region' : 'Add Region'}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Geographic grouping for locations</p>
              </div>
              <button onClick={() => setShowSidebar(false)} className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Region Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. North India"
                  className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. NORTH"
                  className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white font-mono"
                />
              </div>
              <div className="border-t pt-4 mt-6 flex gap-3">
                <button type="button" onClick={() => setShowSidebar(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition">
                  {saving ? 'Saving...' : (editing ? 'Save Region' : 'Create Region')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function LocationsTab({ regions, locations, loadLocations, canWrite }) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState(emptyLocationForm);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Location name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await locationsApi.update(editing.id, formData);
        toast.success('Location updated');
      } else {
        await locationsApi.create(formData);
        toast.success('Location created');
      }
      setShowSidebar(false);
      setFormData(emptyLocationForm);
      setEditing(null);
      await loadLocations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save location');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (location) => {
    if (!confirm(`Delete location "${location.name}"? Depots under it must be moved or deleted first.`)) return;
    try {
      await locationsApi.delete(location.id);
      toast.success('Location deleted');
      await loadLocations();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete location');
    }
  };

  const regionName = (id) => regions.find((r) => r.id === id)?.name || '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-slate-500">Locations sit under regions; depots attach to locations.</p>
        {canWrite && (
          <button
            onClick={() => { setEditing(null); setFormData(emptyLocationForm); setShowSidebar(true); }}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition"
          >
            <Plus className="w-4 h-4" /> Add Location
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
              <th className="py-3 px-4">Location</th>
              <th className="py-3 px-4">Region</th>
              <th className="py-3 px-4">City</th>
              <th className="py-3 px-4">State</th>
              <th className="py-3 px-4 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {locations.map((location) => (
              <tr key={location.id} className="hover:bg-slate-50 transition group">
                <td className="py-3.5 px-4 font-semibold text-slate-900">{location.name}</td>
                <td className="py-3.5 px-4">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-medium border border-blue-100">
                    {regionName(location.region_id)}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-600">{location.city || '—'}</td>
                <td className="py-3.5 px-4 text-slate-600">{location.state || '—'}</td>
                <td className="py-3.5 px-4 text-center">
                  {canWrite && (
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => { setEditing(location); setFormData({ name: location.name || '', region_id: location.region_id || '', city: location.city || '', state: location.state || '' }); setShowSidebar(true); }}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Edit Location"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(location)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                        title="Delete Location"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {locations.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-12 text-slate-400">No locations found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showSidebar && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">{editing ? 'Modify Location' : 'Add Location'}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">A place where depots operate</p>
              </div>
              <button onClick={() => setShowSidebar(false)} className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Location Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Delhi NCR"
                  className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Region</label>
                <select
                  value={formData.region_id}
                  onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                  className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                >
                  <option value="">— None —</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
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
              <div className="border-t pt-4 mt-6 flex gap-3">
                <button type="button" onClick={() => setShowSidebar(false)} className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition">
                  {saving ? 'Saving...' : (editing ? 'Save Location' : 'Create Location')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function HierarchyTab() {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await locationsApi.getTree();
      setTree(res.data);
    } catch {
      toast.error('Failed to load hierarchy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return <div className="text-center py-12 text-slate-400 animate-pulse">Loading hierarchy...</div>;
  }

  return (
    <div className="space-y-4">
      {(tree?.regions || []).map((region) => (
        <Card key={region.id} className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-900">{region.name}</span>
              {region.code && <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{region.code}</span>}
              <span className="ml-auto text-xs text-slate-500">
                {region.location_count} locations • {region.depot_count} depots • {region.available_quantity} MT
              </span>
            </div>
            <div className="pl-4 space-y-3">
              {region.locations.map((location) => (
                <div key={location.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Map className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-semibold text-slate-700 text-sm">{location.name}</span>
                    {location.city && <span className="text-xs text-slate-400">{location.city}</span>}
                    <span className="ml-auto text-xs text-slate-500">
                      {location.depot_count} depots • {location.available_quantity} MT
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {location.depots.map((depot) => (
                      <div key={depot.id} className="bg-white rounded border border-slate-200 px-3 py-2 flex items-center gap-2 text-xs">
                        <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700 truncate">{depot.name}</span>
                        <span className="ml-auto text-emerald-600 font-semibold shrink-0">{depot.available_quantity} MT</span>
                      </div>
                    ))}
                    {location.depots.length === 0 && (
                      <p className="text-xs text-slate-400 col-span-full">No depots.</p>
                    )}
                  </div>
                </div>
              ))}
              {region.locations.length === 0 && (
                <p className="text-xs text-slate-400 pl-2">No locations.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {tree?.unassigned_depots?.length > 0 && (
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-slate-900">Unassigned Depots</span>
              <span className="ml-auto text-xs text-slate-500">{tree.unassigned_depots.length} depots without a location</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tree.unassigned_depots.map((depot) => (
                <span key={depot.id} className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-600">
                  {depot.name} ({depot.available_quantity} MT)
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(!tree?.regions || tree.regions.length === 0) && (!tree?.unassigned_depots || tree.unassigned_depots.length === 0) && (
        <div className="text-center py-12 text-slate-400">No hierarchy data yet.</div>
      )}
    </div>
  );
}

export default function RegionsAndLocations() {
  const { user } = useAuth();
  const canWrite = user?.is_master_admin || user?.role === 'Management' || user?.role === 'Admin';
  const [regions, setRegions] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadRegions = async () => {
    const res = await regionsApi.getAll();
    setRegions(res.data || []);
  };

  const loadLocations = async () => {
    const res = await locationsApi.getAll();
    setLocations(res.data || []);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([loadRegions(), loadLocations()]);
    } catch {
      toast.error('Failed to load location data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredLocations = locations.filter((l) =>
    (l.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Regions & Locations
          </h1>
          <p className="text-xs text-slate-500">Organize depots under a Region → Location hierarchy</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Regions</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{regions.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Globe className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Locations</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{locations.length}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <Map className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Unassigned Depots</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '…' : '—'}</p>
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
              <Warehouse className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Levels</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">3</p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="regions">
        <TabsList className="mb-4">
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
        </TabsList>

        <TabsContent value="regions">
          {loading ? <div className="text-center py-12 text-slate-400 animate-pulse">Loading...</div> : <RegionsTab regions={regions} loadRegions={loadRegions} canWrite={canWrite} />}
        </TabsContent>

        <TabsContent value="locations">
          {loading ? <div className="text-center py-12 text-slate-400 animate-pulse">Loading...</div> : (
            <>
              <div className="relative max-w-sm mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <LocationsTab regions={regions} locations={filteredLocations} loadLocations={loadLocations} canWrite={canWrite} />
            </>
          )}
        </TabsContent>

        <TabsContent value="hierarchy">
          <HierarchyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
