import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PageLayout } from "../components/layout/PageLayout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../components/ui/select";

import { pickupApi, trucksApi, transportersApi, companiesApi, depotsApi } from "../lib/api";
import { usePermissions } from "../lib/permissions";
import { toast } from "sonner";
import { Plus, Trash2, Search, X, Calendar } from "lucide-react";
import { ConfirmationDialogue } from "../components/ui/ConfirmationDialogue";

export default function SchedulePickup() {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("Schedule Pickup");

  const today = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(today);
  const [rows, setRows] = useState([
    createEmptyRow()
  ]);

  const formatDateDDMMYYYY = (dateStr) => {
    const [year, month, day] = dateStr.split("-");
    return `${day}/${month}/${year}`;
  };

  const handleDateChange = (value) => {
    if (value < today) {
      const formatted = formatDateDDMMYYYY(value);
      const confirmed = window.confirm(`You have selected a back date: ${formatted}. Are you sure?`);
      if (!confirmed) {
        return;
      }
    }
    setDate(value);
  };

  const [trucks, setTrucks] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [depots, setDepots] = useState([]);
  const [selectedDepotFilter, setSelectedDepotFilter] = useState('');
  const [selectedDepotCreate, setSelectedDepotCreate] = useState('');
  const selectedDepotCreateName = depots.find((d) => d.id === selectedDepotCreate)?.name || '';
  const [scheduledPickups, setScheduledPickups] = useState([]);
  const [dayCounts, setDayCounts] = useState({
    today: 0,
    tomorrow: 0,
    dayAfter: 0
  });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const getDateString = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split("T")[0];
  };
  console.log(scheduledPickups)
  const filterByDepot = (items) => {
    if (!selectedDepotFilter) return items;
    return items.filter((item) => item.depot_id === selectedDepotFilter);
  };

  const fetchDayCounts = async () => {
    try {
      const [todayRes, tomorrowRes, dayAfterRes] = await Promise.all([
        pickupApi.getByDate(getDateString(0)),
        pickupApi.getByDate(getDateString(1)),
        pickupApi.getByDate(getDateString(2))
      ]);

      setDayCounts({
        today: filterByDepot(todayRes.data || []).filter(p => p.status !== "rescheduled").length,
        tomorrow: filterByDepot(tomorrowRes.data || []).filter(p => p.status !== "rescheduled").length,
        dayAfter: filterByDepot(dayAfterRes.data || []).filter(p => p.status !== "rescheduled").length
      });
    } catch {
      console.error("Failed to load pickup counts");
    }
  };
  useEffect(() => {
    fetchDayCounts();
  }, []);

  useEffect(() => {
    const urlDate = searchParams.get('date');
    if (urlDate && urlDate !== date) {
      setDate(urlDate);
    }
  }, [searchParams]);

  useEffect(() => {
    setSearchParams({ date });
  }, [date]);

  const getDateLabel = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short"
    });
  };

  const updateDateQuery = (newDate) => {
    const updatedParams = new URLSearchParams(searchParams);
    updatedParams.set("date", newDate);
    setSearchParams(updatedParams);
  };

  const formatDateForHeading = (dateStr) => {
    const d = new Date(dateStr + "T00:00:00");
    const day = d.toLocaleDateString("en-IN", { weekday: "long" });
    const formatted = d.toLocaleDateString("en-IN");
    return `${day}, ${formatted}`;
  };

  const fetchScheduledPickups = async () => {
    try {
      const res = await pickupApi.getByDate(date);
      const data = filterByDepot(res.data || []);
      const statusPriority = { "scheduled": 1, "loaded": 2, "rescheduled": 3, "rejected": 4 };
      data.sort((a, b) => (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99));
      setScheduledPickups(data);
    } catch {
      toast.error("Failed to load scheduled pickups");
    }
  };

  useEffect(() => {
    fetchScheduledPickups();
  }, [date, selectedDepotFilter]);

  useEffect(() => {
    fetchDayCounts();
  }, [selectedDepotFilter]);

  const [loading, setLoading] = useState(false);

  const getStatusClasses = (status) => {
    switch (status) {
      case "loaded":
        return "bg-emerald-100 text-emerald-800 border-l-4 border-emerald-500 font-semibold";
      case "verified":
        return "bg-blue-100 text-blue-800 border-l-4 border-blue-500 font-semibold";
      case "scheduled":
        return "bg-slate-100 text-slate-700 border-l-4 border-slate-400 font-semibold";
      case "rescheduled":
        return "bg-orange-100 text-orange-700 border-l-4 border-orange-400 font-bold";
      default:
        return "bg-gray-100 text-gray-800 border-l-4 border-gray-400 font-semibold";
    }
  };

  const renderStatusDetails = (row) => {
    const status = row.status;
    const originalDateRaw = row.original_schedule_date || row.date;
    const formattedOriginalDate = originalDateRaw
      ? new Date(originalDateRaw).toLocaleDateString("en-IN")
      : "-";

    const rescheduleCount = row.reschedule_count ? String(row.reschedule_count).padStart(2, "0") : "00";

    const rescheduledToRaw = row.rescheduled_to || row.schedule_date || row.date;
    let formattedRescheduledTo = "-";
    if (rescheduledToRaw) {
      const sDate = new Date(rescheduledToRaw);
      if (!Number.isNaN(sDate.getTime())) {
        const options = { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" };
        formattedRescheduledTo = sDate.toLocaleDateString("en-IN", options);
      }
    }

    let daysSinceFirst = "00";
    // Calculate days between original scheduled date and the rescheduled date
    if (row.original_schedule_date && row.rescheduled_to) {
      const original = new Date(row.original_schedule_date);
      const rescheduled = new Date(row.rescheduled_to);
      if (!Number.isNaN(original.getTime()) && !Number.isNaN(rescheduled.getTime())) {
        const baseOriginal = Date.UTC(original.getFullYear(), original.getMonth(), original.getDate());
        const baseRescheduled = Date.UTC(rescheduled.getFullYear(), rescheduled.getMonth(), rescheduled.getDate());
        const diffMs = baseRescheduled - baseOriginal;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        daysSinceFirst = String(Math.abs(diffDays)).padStart(2, "0");
      }
    } else if (row.original_schedule_date) {
      // Fallback: if no rescheduled_to, compare with current scheduled date
      const original = new Date(row.original_schedule_date);
      const current = new Date(row.date);
      if (!Number.isNaN(original.getTime()) && !Number.isNaN(current.getTime())) {
        const baseOriginal = Date.UTC(original.getFullYear(), original.getMonth(), original.getDate());
        const baseCurrent = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());
        const diffMs = baseCurrent - baseOriginal;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        daysSinceFirst = String(Math.abs(diffDays)).padStart(2, "0");
      }
    }

    const showReschedulePanel = status === "rescheduled" || (status === "scheduled" && row.reschedule_count > 0);
    const rescheduleLabel = status === "rescheduled" ? "Rescheduled to:" : "Rescheduled from:";
    const rescheduleValue = status === "rescheduled" ? formattedRescheduledTo : formattedOriginalDate;

    return (
      <div className="flex flex-col gap-2 items-end">
        <span className={`text-xs px-2 py-1 rounded ${getStatusClasses(status)}`}>
          {status ? status.replace(/_/g, " ") : "-"}
        </span>

        {showReschedulePanel && (
          <div className="bg-slate-50 border border-slate-100 rounded-md p-2 text-[11px] text-slate-600 space-y-1 font-medium leading-normal shadow-sm">
            <div>
              <span className="text-slate-400 font-normal">{rescheduleLabel}</span>{" "}
              <span className="text-slate-800 font-semibold">{rescheduleValue}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100/70 pt-1 mt-1">
              <div>
                <span className="text-slate-400 font-normal">Reschedule count:</span>{" "}
                <span className="text-orange-700 font-bold bg-orange-50 px-1 rounded border border-orange-100">{rescheduleCount}</span>
              </div>
              <div>
                <span className="text-slate-400 font-normal">Days since first:</span>{" "}
                <span className="text-rose-700 font-bold bg-rose-50 px-1 rounded border border-rose-100">{daysSinceFirst} Days</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 pt-0.5 border-t border-dashed border-slate-200">
              Original date: {formattedOriginalDate}
            </div>
          </div>
        )}
      </div>
    );
  };

  function createEmptyRow() {
    return {
      truck_id: "",
      truck_number: "",
      vehicleSearch: "",
      vehicleDropdownOpen: false,

      transporter_id: "",
      transporter_name: "",

      company_id: "",
      company_name: "",

      depot_id: "",
      depot_name: "",
    };
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterDepotChange = (depotId) => {
    setSelectedDepotFilter(depotId);
  };

  const handleCreateDepotChange = (depotId) => {
    const depot = depots.find((d) => d.id === depotId);
    setSelectedDepotCreate(depotId);
    setRows((prevRows) => prevRows.map((row) => ({
      ...row,
      depot_id: depotId,
      depot_name: depot?.name || ''
    })));
  };

  const fetchData = async () => {
    const [truckRes, transporterRes, companyRes, depotRes] = await Promise.all([
      trucksApi.getAll(),
      transportersApi.getAll(),
      companiesApi.getAll(),
      depotsApi.getAll()
    ]);

    setTrucks(truckRes.data || []);
    setTransporters(transporterRes.data || []);
    setCompanies(companyRes.data || []);
    setDepots(depotRes.data || []);
  };

  // =============================
  // VEHICLE LOGIC (MATCH LIFTINGS)
  // =============================

  const updateRow = (i, key, value) => {
    const updated = [...rows];
    updated[i][key] = value;
    setRows(updated);
  };

  const filteredTrucks = (search) =>
    trucks?.filter(t =>
      t?.vehicle_number?.toLowerCase()?.includes(search?.toLowerCase())
    );

  const exactMatchExists = (search) =>
    trucks?.some(
      t => t?.vehicle_number?.toLowerCase() === search?.toLowerCase()
    );

  const handleVehicleSelect = (index, truck) => {
    const updated = [...rows];

    updated[index].truck_id = truck.id;
    updated[index].truck_number = truck.vehicle_number;
    updated[index].transporter_name = truck.transporter_name || "";
    updated[index].vehicleSearch = truck.vehicle_number;
    updated[index].vehicleDropdownOpen = false;

    setRows(updated);
  };

  const handleCreateVehicle = (index) => {
    const updated = [...rows];
    const value = updated[index].vehicleSearch.trim().toUpperCase();

    updated[index].truck_id = "";
    updated[index].truck_number = value;
    updated[index].vehicleDropdownOpen = false;

    setRows(updated);

    toast.success(`Using new vehicle: ${value}`);
  };

  const validatePlanRows = () => {
    const seen = new Set();

    for (let r of rows) {
      if (!r.truck_number) {
        toast.error("Truck number is required");
        return false;
      }
      if (r.driver_phone) {
        const cleanPhone = r.driver_phone.replace(/\D/g, "");

        if (cleanPhone.length !== 10) {
          toast.error(
            `Driver phone must be exactly 10 digits for truck ${r.truck_number}`
          );
          return false;
        }
      }

      const key = r.truck_number.trim().toUpperCase();
      if (seen.has(key)) {
        toast.error(`Duplicate truck: ${key}`);
        return false;
      }

      seen.add(key);
    }

    return true;
  };

  const clearVehicle = (index) => {
    const updated = [...rows];
    updated[index].truck_id = "";
    updated[index].truck_number = "";
    updated[index].vehicleSearch = "";
    setRows(updated);
  };

  // =============================
  // ROW HANDLING
  // =============================

  const addRow = () => setRows([...rows, createEmptyRow()]);

  const removeRow = (i) => {
    const updated = [...rows];
    updated.splice(i, 1);
    setRows(updated);
  };

  // =============================
  // SUBMIT
  // =============================

  const handleSubmit = async () => {
    if (!selectedDepotCreate) {
      return toast.error("Select a depot for dispatch before planning.");
    }
    if (!validatePlanRows()) {
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setConfirmLoading(true);
    setLoading(true);

    try {
      for (let r of rows) {
        await pickupApi.create({
          date,
          truck_number: r.truck_number,
          transporter_id: r.transporter_id,
          transporter_name: r.transporter_name,
          company_id: r.company_id,
          company_name: r.company_name,
          depot_id: r.depot_id,
          depot_name: r.depot_name,
          estimated_weight_mt: parseFloat(r.estimated_weight_mt || 0),
          driver_phone: r.driver_phone
        });
      }

      toast.success("Planned dispatch created successfully");
      setRows([createEmptyRow()]);
      setConfirmOpen(false);
      await Promise.all([
        fetchData(),
        fetchScheduledPickups(),
        fetchDayCounts()
      ]);
    } catch (error) {
      toast.error(
        error?.response?.data?.detail ||
        "Failed to create planned dispatch"
      );
    } finally {
      setConfirmLoading(false);
      setLoading(false);
    }
  };

  if (!canCreate) {
    return (
      <PageLayout title="Planned Dispatch">
        <div className="p-8 text-center">No permission</div>
      </PageLayout>
    );
  }
  const DaySummaryCard = ({ title, dateLabel, count, colorClass, textColorClass, onClick, isSelected = false }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`group w-full text-left rounded-xl border-2 shadow-sm transition-all duration-150 overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isSelected ? 'bg-blue-50 border-blue-500 shadow-md' : 'bg-white border-slate-300 hover:-translate-y-0.5 hover:shadow-md hover:border-slate-400'}`}
    >
      <Card className="border-0 bg-transparent shadow-none rounded-none">
        {/* Distinct Top Accent Bar - expands dynamically on hover */}
        <div className={`h-1.5 w-full ${colorClass} transition-all duration-150 ${isSelected ? 'group-hover:h-2' : 'group-hover:h-2'}`} />

        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">

            <div className="space-y-1.5 min-w-0">
              <p className={`text-base font-bold tracking-tight truncate ${textColorClass} ${isSelected ? 'text-slate-900' : ''}`}>
                {title}
              </p>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-500' : 'bg-slate-400 group-hover:bg-blue-500'} transition-colors`} />
                <p className={`text-xs font-semibold tracking-wide ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                  {dateLabel}
                </p>
              </div>
            </div>

            {/* Right Side Metrics Badge - Bold, large, high-contrast container */}
            <div className={`text-right shrink-0 px-4 py-2 rounded-xl border-2 ${isSelected ? 'bg-white border-blue-200 text-blue-900' : 'bg-slate-100 border-slate-200 text-slate-900'} shadow-inner transition-colors`}>
              <p className="text-2xl font-black tracking-tight leading-none">
                {count}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                Trucks
              </p>
            </div>

          </div>
        </CardContent>
      </Card>
    </button>
  );






  return (
    <PageLayout
      title="Planned Dispatch"
      subtitle={" Schedule trucks for pickup and dispatch"}
    >
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex items-start md:items-center gap-3 bg-slate-50 border border-slate-100 p-4 rounded-xl">
          <Calendar className="w-7 h-7 text-blue-600 mt-1 md:mt-0" />

          {/* ✅ Dynamic, inline-editable big bold heading */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 w-full">
            <div className="min-w-[280px]">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                Plan Dispatch For
              </h2>

              <div className="mt-3">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="text-3xl font-bold text-blue-600 bg-transparent hover:bg-blue-50 focus:bg-blue-50 focus:outline-none rounded px-2 cursor-pointer transition-colors border-none font-sans"
                  style={{ colorScheme: "light" }}
                />
                <p className="text-xs text-slate-500 font-medium px-2 mt-0.5">
                  {new Date(date).toLocaleDateString("en-US", { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })}
                </p>

              </div>
            </div>
            <div className="flex flex-col gap-1.5 w-full sm:w-64">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Depot Filter
              </label>

              <Select
                value={selectedDepotFilter}
                onValueChange={handleFilterDepotChange}
              >
                <SelectTrigger className="h-10 text-sm font-medium text-slate-900 border-slate-200 focus:ring-slate-400 bg-white">
                  <SelectValue placeholder="Select depot" />
                </SelectTrigger>

                <SelectContent>
                  {/* 1. ✅ CORRECT: The "Clear/All" option goes INSIDE SelectContent */}
                  <SelectItem value="ALL" className="text-sm font-medium text-slate-500 italic">
                    All Assigned Depots
                  </SelectItem>

                  {/* Separator line for better visual hierarchy */}
                  {depots.length > 0 && <div className="h-px bg-slate-100 my-1" />}

                  {/* 2. Dynamic options mapping */}
                  {depots.length === 0 ? (
                    <div className="p-2 text-xs text-slate-400 text-center">No depots available</div>
                  ) : (
                    depots.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-sm">
                        {d.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <Card className="mt-4">
        <CardContent className="pt-6 space-y-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-slate-700">Depot for Dispatch</span>
              <Select
                value={selectedDepotCreate}
                onValueChange={handleCreateDepotChange}
              >
                <SelectTrigger className="h-12 text-slate-900">
                  <SelectValue placeholder="Choose depot for new dispatch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-sm font-medium text-slate-600 font-semibold">
                    All Assigned Depots
                  </SelectItem>

                  {depots.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">This depot applies to planned dispatch rows and is separate from the filter above.</p>
            </div>
          </div>

          {!selectedDepotCreate ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-700">
              <p className="text-xl font-semibold text-slate-900">Plan dispatch for Depot:</p>
              <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
                Select a depot above to begin adding trucks and create planned dispatch entries for {formatDateForHeading(date)}.
              </p>
            </div>
          ) : (
            <>
              {rows.map((row, i) => {
                const matches = filteredTrucks(row.vehicleSearch);

                return (
                  <div
                    key={i}
                    className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end border rounded-lg p-4"
                  >

                    {/* 🚛 TRUCK */}
                    <div className="relative">
                      <Label>Truck Number *</Label>

                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                        <Input
                          value={row.vehicleSearch}
                          onChange={(e) => {
                            updateRow(i, "vehicleSearch", e.target.value.toUpperCase());
                            updateRow(i, "vehicleDropdownOpen", true);
                          }}
                          onFocus={() => updateRow(i, "vehicleDropdownOpen", true)}
                          className="pl-8"
                          placeholder="Search or enter truck"
                        />

                        {row?.vehicleSearch && (
                          <button
                            onClick={() => clearVehicle(i)}
                            className="absolute right-2 top-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown */}
                      {row.vehicleDropdownOpen && (
                        <div className="absolute bg-white border w-full z-50 max-h-60 overflow-auto rounded shadow">

                          {matches.map(t => (
                            <div
                              key={t.id}
                              onClick={() => handleVehicleSelect(i, t)}
                              className="p-2 hover:bg-blue-50 cursor-pointer"
                            >
                              {t.vehicle_number}
                            </div>
                          ))}

                          {row.vehicleSearch && !exactMatchExists(row.vehicleSearch) && (
                            <div
                              onClick={() => handleCreateVehicle(i)}
                              className="p-2 bg-green-50 cursor-pointer font-medium"
                            >
                              + Add "{row.vehicleSearch}"
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 🚚 TRANSPORTER */}
                    <div>
                      <Label>Transporter</Label>
                      <Select
                        value={row.transporter_id}
                        onValueChange={(v) => {
                          const t = transporters.find(x => x.id === v);
                          updateRow(i, "transporter_id", v);
                          updateRow(i, "transporter_name", t?.name || "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select transporter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL" className="text-sm font-medium text-slate-500 italic">
                            All Transporters
                          </SelectItem>
                          {transporters.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 🏢 COMPANY */}
                    <div>
                      <Label>Company</Label>

                      <Select
                        value={row.company_id}
                        onValueChange={(v) => {
                          const c = companies.find(x => x.id === v);

                          updateRow(i, "company_id", v);
                          updateRow(i, "company_name", c?.name || "");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>

                        <SelectContent>
                                 <SelectItem value="ALL" className="text-sm font-medium text-slate-500 italic">
                            All Companies
                          </SelectItem>
                          {companies.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ⚖️ ESTIMATED WEIGHT */}
                    <div>
                      <Label>Estimated Weight (MT)</Label>

                      <Input
                        type="number"
                        step="0.01"
                        value={row.estimated_weight_mt}
                        onChange={(e) =>
                          updateRow(i, "estimated_weight_mt", e.target.value)
                        }
                        placeholder="Enter weight"
                      />
                    </div>

                    {/* 📱 DRIVER */}
                    <div>
                      <Label>Driver Phone </Label>
                      <Input
                        value={row.driver_phone}
                        maxLength={10}
                        onChange={(e) =>
                          updateRow(
                            i,
                            "driver_phone",
                            e.target.value.replace(/\D/g, "")
                          )}
                        placeholder="Enter driver phone"
                      />
                    </div>

                    {/* ❌ REMOVE */}
                    <div className="flex gap-2">
                      {rows.length > 1 && (
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => removeRow(i)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ➕ ADD ROW */}
              <Button variant="outline" onClick={addRow}>
                <Plus className="w-4 h-4 mr-1" />
                Add Truck
              </Button>

              {/* ✅ SUBMIT */}
              <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={loading}>
                  Plan Dispatch
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4">
          <DaySummaryCard
            title="TODAY"
            dateLabel={getDateLabel(0)}
            count={dayCounts.today}
            colorClass="border-t-emerald-500"
            textColorClass="text-emerald-600"
            isSelected={date === getDateString(0)}
            onClick={() => updateDateQuery(getDateString(0))}
          />

          <DaySummaryCard
            title="TOMORROW"
            dateLabel={getDateLabel(1)}
            count={dayCounts.tomorrow}
            colorClass="border-t-blue-500"
            textColorClass="text-blue-600"
            isSelected={date === getDateString(1)}
            onClick={() => updateDateQuery(getDateString(1))}
          />

          <DaySummaryCard
            title="DAY AFTER TOMORROW"
            dateLabel={getDateLabel(2)}
            count={dayCounts.dayAfter}
            colorClass="border-t-purple-500"
            textColorClass="text-purple-600"
            isSelected={date === getDateString(2)}
            onClick={() => updateDateQuery(getDateString(2))}
          />
        </div>

        <CardContent className="pt-6">
          <h3 className="text-lg md:text-xl font-semibold mb-4">
            Scheduled Pickups for {formatDateForHeading(date)}
          </h3>

          {scheduledPickups.length === 0 ? (
            <p className="text-sm text-gray-500">No pickups scheduled</p>
          ) : (
            <div className="space-y-2">
              {scheduledPickups.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center border rounded p-3 text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {p.truck_number}
                    </div>

                    <div className="text-gray-500 text-xs">
                      {p.transporter_name} • {p.driver_phone}
                    </div>

                    <div className="text-xs text-blue-600 mt-1">
                      {p.company_name || "-"} • Est:{" "}
                      {Number(p.estimated_weight_mt || 0).toFixed(2)} MT
                    </div>
                  </div>

                  {renderStatusDetails(p)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialogue
        open={confirmOpen}
        onOpenChange={(open) => setConfirmOpen(open)}
        title="Confirm Planned Dispatch"
        description={
          selectedDepotCreateName
            ? `You are about to plan dispatch for ${selectedDepotCreateName} on ${formatDateDDMMYYYY(date)}.`
            : `You are about to plan dispatch on ${formatDateDDMMYYYY(date)}.`
        }
        confirmLabel="Plan Dispatch"
        cancelLabel="Cancel"
        loading={confirmLoading}
        onConfirm={handleConfirmSubmit}
        confirmVariant="default"
        className="max-w-lg"
      >
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Review details</p>
          <div className="mt-2 space-y-1">
            <p>
              <span className="font-medium">Depot:</span> {selectedDepotCreateName || "None"}
            </p>
            <p>
              <span className="font-medium">Date:</span> {formatDateDDMMYYYY(date)}
            </p>
            <p>
              <span className="font-medium">Truck rows:</span> {rows.length}
            </p>
          </div>
        </div>
      </ConfirmationDialogue>
    </PageLayout>
  );
}