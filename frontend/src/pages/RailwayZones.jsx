"use client";

import React, { useState, useEffect } from 'react';
import { 
  Train, 
  MapPin, 
  Layers, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Globe, 
  Building,
  SlidersHorizontal
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';
import { railwayZonesApi } from '../lib/api';
import { Can } from '../components/Can';
import { usePermissions } from '../lib/permissions';

export default function RailwayZonePage() {
  const { hasActionPermission } = usePermissions();
  // Mock Data mimicking the provided spreadsheet structure
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search & Form States
  const [searchTerm, setSearchTerm] = useState("");
  const [showSidebar, setShowSidebar] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    country: "INDIA",
    railwayZone: "",
    zoneCode: "",
    headquarters: "",
    areaCoverage: "",
    divisionsAllotted: ""
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const loadZones = async () => {
    setLoading(true);
    try {
      const response = await railwayZonesApi.getAll();
      setZones(response.data || []);
    } catch (error) {
      console.error('Failed to load railway zones', error);
      toast.error('Unable to load Railway Zones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingZone) {
        const response = await railwayZonesApi.update(editingZone.id, formData);
        setZones(prev => prev.map(item => item.id === editingZone.id ? response.data : item));
        setEditingZone(null);
        toast.success('Railway Zone updated');
      } else {
        const response = await railwayZonesApi.create(formData);
        setZones(prev => [...prev, response.data]);
        toast.success('Railway Zone created');
      }
      setFormData({ country: "INDIA", railwayZone: "", zoneCode: "", headquarters: "", areaCoverage: "", divisionsAllotted: "" });
      setShowSidebar(false);
    } catch (error) {
      console.error('Failed to save railway zone', error);
      toast.error('Unable to save Railway Zone');
    }
  };

  const handleEdit = (zone) => {
    setEditingZone(zone);
    setFormData({
      country: zone.country,
      railwayZone: zone.railwayZone,
      zoneCode: zone.zoneCode,
      headquarters: zone.headquarters,
      areaCoverage: zone.areaCoverage,
      divisionsAllotted: zone.divisionsAllotted
    });
    setShowSidebar(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this Railway Zone?")) return;

    try {
      await railwayZonesApi.delete(id);
      setZones(prev => prev.filter(item => item.id !== id));
      toast.success('Railway Zone deleted');
    } catch (error) {
      console.error('Failed to delete railway zone', error);
      toast.error('Unable to delete Railway Zone');
    }
  };

  // Filter logic
  const filteredZones = zones.filter(z => 
    z.railwayZone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.zoneCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.headquarters.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-6 text-slate-800">
      
      {/* Upper Statistics/Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Railway Zones
          </h1>
          <p className="text-xs text-slate-500">Manage country-specific regional transit zones and divisions</p>
        </div>
        
        <Can action="create_railway_zone">
          <button 
            onClick={() => { setEditingZone(null); setShowSidebar(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-lg shadow transition-all duration-200 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" /> Add Railway Zone
          </button>
        </Can>
      </div>

      {/* Analytical Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Zones</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{zones.length}</p>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Train className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Headquarters</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {new Set(zones.map(z => z.headquarters)).size}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
              <Building className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Divisions Logged</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {zones.reduce((sum, z) => sum + (z.divisionsAllotted ? z.divisionsAllotted.split(',').length : 0), 0)}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Countries</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {new Set(zones.map(z => z.country.toUpperCase())).size}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <Globe className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Utility Row */}
      <div className="flex bg-white p-3 rounded-lg shadow-sm border items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by zone name, code or HQ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 border rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Showing {filteredZones.length} entries</span>
        </div>
      </div>

      {/* Core Spreadsheet Table Section */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-semibold">
                <th className="py-3 px-4 w-16 text-center">S.No</th>
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-4">Railway Zone</th>
                <th className="py-3 px-4">Zone Code</th>
                <th className="py-3 px-4">Headquarters</th>
                <th className="py-3 px-4">Area Coverage</th>
                <th className="py-3 px-4">Divisions Allotted</th>
                <th className="py-3 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredZones.length > 0 ? (
                filteredZones.map((zone, index) => (
                  <tr key={zone.id} className="hover:bg-slate-50 transition duration-150 group">
                    <td className="py-3.5 px-4 font-mono text-center text-slate-400 font-medium">{index + 1}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-600">{zone.country}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">{zone.railwayZone}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-mono font-bold border border-blue-100">
                        {zone.zoneCode}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        {zone.headquarters}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={zone.areaCoverage}>
                      {zone.areaCoverage || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={zone.divisionsAllotted}>
                      {zone.divisionsAllotted || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Can action="update_railway_zone">
                          <button 
                            onClick={() => handleEdit(zone)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                            title="Edit Zone"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>
                        <Can action="delete_railway_zone">
                          <button 
                            onClick={() => handleDelete(zone.id)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                            title="Delete Zone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-slate-400 font-medium">
                    No Railway Zones found matching your search matrix.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flyout Slidover Sidebar Form for Creation & Updates */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in p-6 overflow-y-auto">
            
            <div className="flex justify-between items-center border-b pb-4 mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingZone ? "Modify Railway Zone" : "Register Railway Zone"}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Fill out details matching official data sheets</p>
              </div>
              <button 
                onClick={() => setShowSidebar(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-mono p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Country Field */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Country</label>
                  <input 
                    type="text" 
                    name="country"
                    required
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
                  />
                </div>

                {/* Railway Zone Input */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Railway Zone Name</label>
                  <input 
                    type="text" 
                    name="railwayZone"
                    required
                    placeholder="e.g. East Coast Railway"
                    value={formData.railwayZone}
                    onChange={handleInputChange}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Zone Code Input */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Railway Zone Code</label>
                  <input 
                    type="text" 
                    name="zoneCode"
                    required
                    placeholder="e.g. ECoR"
                    value={formData.zoneCode}
                    onChange={handleInputChange}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Headquarters Input */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Headquarters Location</label>
                  <input 
                    type="text" 
                    name="headquarters"
                    required
                    placeholder="e.g. Bhubaneswar"
                    value={formData.headquarters}
                    onChange={handleInputChange}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Area Coverage Input */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Area Coverage (States)</label>
                  <textarea 
                    name="areaCoverage"
                    rows="2"
                    placeholder="e.g. Odisha, Andhra Pradesh"
                    value={formData.areaCoverage}
                    onChange={handleInputChange}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* Divisions Allotted Input */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Divisions Allotted</label>
                  <textarea 
                    name="divisionsAllotted"
                    rows="2"
                    placeholder="e.g. Khurda Road, Sambalpur, Rayagada"
                    value={formData.divisionsAllotted}
                    onChange={handleInputChange}
                    className="w-full text-xs p-2.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Separate structural divisions with commas</p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="border-t pt-4 mt-6 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowSidebar(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition"
                >
                  {editingZone ? "Save Parameters" : "Provision Zone"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}