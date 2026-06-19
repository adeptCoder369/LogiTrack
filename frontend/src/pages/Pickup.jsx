import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/layout/PageLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import PickupStatsCards from '../components/pickup/StatsCards';
import PickupFilterPanel from '../components/pickup/FilterPanel';
import { pickupApi, uploadFile, getFileUrl, depotsApi, transportersApi, companiesApi } from '../lib/api';
import { usePermissions } from '../lib/permissions';
import { toast } from 'sonner';
import { Calendar, Truck, Clock, RotateCcw, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "../components/ui/dialog";
import { PickupDataTable } from '@/components/pickup/DataTable';
import SlideToConfirm from '../components/shared/SlideToConfirm';

const columns = [
  {
    key: 'truck_number',
    label: 'Truck',
    render: (v) => <span className="mono font-medium">{v}</span>
  },
  {
    key: 'transporter_name',
    label: 'Transporter'
  },
  {
    key: 'company_name',
    label: 'Company'
  },
  {
    key: 'estimated_weight_mt',
    label: 'Estimated WT',
    render: (v) =>
      v ? `${Number(v).toFixed(2)} MT` : '-'
  },
  {
    key: 'driver_phone',
    label: 'Driver'
  },
  // {
  //   key: 'status',
  //   label: 'Status',
  //   render: (v) => {
  //     const colors = {
  //       scheduled: 'bg-slate-100 text-slate-700 border-l-4 border-slate-400',
  //       loading_started: 'bg-amber-100 text-amber-800 border-l-4 border-amber-500',
  //       loaded: 'bg-emerald-100 text-emerald-800 border-l-4 border-emerald-500',
  //       rescheduled: 'bg-orange-100 text-orange-800 border-l-4 border-orange-500',
  //       rejected: 'bg-red-100 text-red-800 border-l-4 border-red-500',
  //       verified: 'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
  //     };

  //     return (
  //       <span className={`rounded px-2.5 py-0.5 text-xs font-semibold inline-block ${colors[v] || ''}`}>
  //         {v}
  //       </span>
  //     );
  //   }
  // },


  // {
  //   key: 'status',
  //   label: 'Status',
  //   render: (v, row) => {
  //     const colors = {
  //       scheduled: 'bg-slate-100 text-slate-700 border-l-4 border-slate-400',
  //       loading_started: 'bg-amber-100 text-amber-800 border-l-4 border-amber-500',
  //       loaded: 'bg-emerald-100 text-emerald-800 border-l-4 border-emerald-500',
  //       rescheduled: 'bg-orange-100 text-orange-800 border-l-4 border-orange-500',
  //       rejected: 'bg-red-100 text-red-800 border-l-4 border-red-500',
  //       verified: 'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
  //     };

  //     const originalDateRaw = row.original_schedule_date || row.date;
  //     const formattedOriginalDate = originalDateRaw
  //       ? new Date(originalDateRaw).toLocaleDateString('en-IN')
  //       : '-';

  //     const rescheduleCount = row.reschedule_count ? String(row.reschedule_count).padStart(2, '0') : '00';

  //     const rescheduledToRaw = row.rescheduled_to || row.schedule_date || row.date;
  //     let formattedRescheduledTo = '-';
  //     if (rescheduledToRaw) {
  //       const sDate = new Date(rescheduledToRaw);
  //       if (!Number.isNaN(sDate.getTime())) {
  //         const options = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
  //         formattedRescheduledTo = sDate.toLocaleDateString('en-IN', options);
  //       }
  //     }

  //     let daysSinceFirst = '00';
  //     const original = row.original_schedule_date ? new Date(row.original_schedule_date) : new Date(row.date);
  //     const scheduled = row.date ? new Date(row.date) : new Date(row.date);

  //     if (!Number.isNaN(original.getTime()) && !Number.isNaN(scheduled.getTime())) {
  //       const baseOriginal = Date.UTC(original.getFullYear(), original.getMonth(), original.getDate());
  //       const baseScheduled = Date.UTC(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate());
  //       const diffMs = baseScheduled - baseOriginal;
  //       const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  //       daysSinceFirst = diffDays >= 0 ? String(diffDays).padStart(2, '0') : '00';
  //     }

  //     const showReschedulePanel = v === 'rescheduled' || (v === 'scheduled' && row.reschedule_count > 0);
  //     const rescheduleLabel = v === 'rescheduled' ? 'Rescheduled to:' : 'Rescheduled from:';
  //     const rescheduleValue = v === 'rescheduled' ? formattedRescheduledTo : formattedOriginalDate;

  //     return (
  //       <div className="flex flex-col gap-1.5 min-w-[170px] text-left">
  //         <div>
  //           <span className={`rounded px-2.5 py-0.5 text-xs font-semibold inline-block capitalize ${colors[v] || ''}`}>
  //             {v ? v.replace('_', ' ') : '-'}
  //           </span>
  //         </div>

  //         {showReschedulePanel && (
  //           <div className="bg-slate-50 border border-slate-100 rounded-md p-2 text-[11px] text-slate-600 space-y-1 font-medium leading-normal shadow-sm">
  //             <div>
  //               <span className="text-slate-400 font-normal">{rescheduleLabel}</span>{' '}
  //               <span className="text-slate-800 font-semibold">{rescheduleValue}</span>
  //             </div>
  //             <div className="flex justify-between border-t border-slate-100/70 pt-1 mt-1">
  //               <div>
  //                 <span className="text-slate-400 font-normal">Reschedule count:</span>{' '}
  //                 <span className="text-orange-700 font-bold bg-orange-50 px-1 rounded border border-orange-100">{rescheduleCount}</span>
  //               </div>
  //               <div>
  //                 <span className="text-slate-400 font-normal">Days since first:</span>{' '}
  //                 <span className="text-rose-700 font-bold bg-rose-50 px-1 rounded border border-rose-100">{daysSinceFirst} Days</span>
  //               </div>
  //             </div>
  //             <div className="text-[10px] text-slate-400 pt-0.5 border-t border-dashed border-slate-200">
  //               Original date: {formattedOriginalDate}
  //             </div>
  //           </div>
  //         )}
  //       </div>
  //     );
  //   }
  // },


  {
    key: 'status',
    label: 'Status',
    render: (v, row) => {

      console.log({
        status: row.status,
        original: row.original_schedule_date,
        currentDate: row.date,
        scheduleDate: row.schedule_date,
        rescheduledTo: row.rescheduled_to,
        count: row.reschedule_count
      }); const colors = {
        scheduled: 'bg-slate-100 text-slate-700 border-l-4 border-slate-400',
        loading_started: 'bg-amber-100 text-amber-800 border-l-4 border-amber-500',
        loaded: 'bg-emerald-100 text-emerald-800 border-l-4 border-emerald-500',
        rescheduled: 'bg-orange-100 text-orange-800 border-l-4 border-orange-500',
        rejected: 'bg-red-100 text-red-800 border-l-4 border-red-500',
        verified: 'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
      };

      // 1. Get and format Original Baseline Date
      const originalDateRaw = row.original_schedule_date || row.date;
      const formattedOriginalDate = originalDateRaw
        ? new Date(originalDateRaw).toLocaleDateString('en-IN')
        : '-';

      // 2. Format the count
      let rawCount = Number(row.reschedule_count) || 0;
      const rescheduleCount = String(rawCount).padStart(2, '0');

      // 3. Get and format Target/Current Rescheduled Date
      const rescheduledToRaw = row.rescheduled_to || row.schedule_date || row.date;
      let formattedRescheduledTo = '-';
      if (rescheduledToRaw) {
        const sDate = new Date(rescheduledToRaw);
        if (!Number.isNaN(sDate.getTime())) {
          const options = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
          formattedRescheduledTo = sDate.toLocaleDateString('en-IN', options);
        }
      }

      // 4. Calculate days between original scheduled date and rescheduled date
      let daysSinceFirst = '00';
      if (row.original_schedule_date && row.rescheduled_to) {
        // Primary path: both original and rescheduled dates exist
        const original = new Date(row.original_schedule_date);
        const rescheduled = new Date(row.rescheduled_to);

        if (!Number.isNaN(original.getTime()) && !Number.isNaN(rescheduled.getTime())) {
          const baseOriginal = Date.UTC(original.getFullYear(), original.getMonth(), original.getDate());
          const baseRescheduled = Date.UTC(rescheduled.getFullYear(), rescheduled.getMonth(), rescheduled.getDate());
          const diffMs = baseRescheduled - baseOriginal;
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          daysSinceFirst = String(Math.abs(diffDays)).padStart(2, '0');
        }
      } else if (row.original_schedule_date && (row.schedule_date || row.date)) {
        // Fallback: if no explicit rescheduled_to, use schedule_date or date
        const original = new Date(row.original_schedule_date);
        const current = new Date(row.schedule_date || row.date);

        if (!Number.isNaN(original.getTime()) && !Number.isNaN(current.getTime())) {
          const baseOriginal = Date.UTC(original.getFullYear(), original.getMonth(), original.getDate());
          const baseCurrent = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate());
          const diffMs = baseCurrent - baseOriginal;
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          daysSinceFirst = String(Math.abs(diffDays)).padStart(2, '0');
        }
      }

      // Panel visibility rules
      const showReschedulePanel = v === 'rescheduled' || (v === 'scheduled' && rawCount > 0);
      const rescheduleLabel = v === 'rescheduled' ? 'Rescheduled to:' : 'Rescheduled from:';
      const rescheduleValue = v === 'rescheduled' ? formattedRescheduledTo : formattedOriginalDate;

      return (
        <div className="flex flex-col gap-1.5 min-w-[170px] text-left">
          <div>
            <span className={`rounded px-2.5 py-0.5 text-xs font-semibold inline-block capitalize ${colors[v] || ''}`}>
              {v ? v.replace('_', ' ') : '-'}
            </span>
          </div>

          {showReschedulePanel && (
            <div className="bg-slate-50 border border-slate-100 rounded-md p-2 text-[11px] text-slate-600 space-y-1 font-medium leading-normal shadow-sm">
              <div>
                <span className="text-slate-400 font-normal">{rescheduleLabel}</span>{' '}
                <span className="text-slate-800 font-semibold">{rescheduleValue}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100/70 pt-1 mt-1">
                <div>
                  <span className="text-slate-400 font-normal">Reschedule count:</span>{' '}
                  <span className="text-orange-700 font-bold bg-orange-50 px-1 rounded border border-orange-100">{rescheduleCount}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-normal">Days since first:</span>{' '}
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
    }
  },
  // {
  //   key: 'original_schedule_date',
  //   label: 'Original Date',
  //   render: (v, row) => {
  //     const original = v || row.date;
  //     return original ? new Date(original).toLocaleDateString('en-IN') : '-';
  //   }
  // },
  // {
  //   key: 'reschedule_count',
  //   label: 'Reschedules',
  //   render: (v) => v ? v : 0
  // },
  {
    key: 'date',
    label: 'Scheduled Date',
    render: (v) => v ? new Date(v).toLocaleDateString('en-IN') : '-'
  },
  // {
  //   key: 'days_since_first_schedule',
  //   label: 'Days Since First',
  //   render: (_, row) => {
  //     // 1. Fall back to row.date if original_schedule_date is missing
  //     const original = row.original_schedule_date ? new Date(row.original_schedule_date) : new Date(row.date);

  //     // 2. Fall back to row.date if current schedule_date is missing 
  //     const scheduled = row.schedule_date ? new Date(row.schedule_date) : new Date(row.date);
  //     // Safety validation check for malformed dates
  //     if (Number.isNaN(original.getTime()) || Number.isNaN(scheduled.getTime())) {
  //       return '-';
  //     }

  //     // 3. Strip timezones/hours cleanly without modifying the source variables in place
  //     const baseOriginal = Date.UTC(original.getFullYear(), original.getMonth(), original.getDate());
  //     const baseScheduled = Date.UTC(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate());

  //     // 4. Calculate the difference (Scheduled Date minus Original Date)
  //     const diffMs = baseScheduled - baseOriginal;
  //     const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  //     // Return the number of days delayed (or 0 if processed early/on-time)
  //     return diffDays >= 0 ? diffDays : 0;
  //   }
  // },
  {
    key: 'loading_start_time',
    label: 'Start',
    render: (v) => v ? new Date(v).toLocaleTimeString('en-IN') : '-'
  },
  {
    key: 'loading_end_time',
    label: 'End',
    render: (v) => v ? new Date(v).toLocaleTimeString('en-IN') : '-'
  },
  {
    key: 'duration',
    label: 'Duration',
    render: (_, row) => {
      const duration = getDuration(row.loading_start_time, row.loading_end_time);
      return (
        <span className="font-medium text-blue-600">
          {duration}
        </span>
      );
    }
  }
];

const getDuration = (start, end) => {
  if (!start || !end) return "-";

  const startTime = new Date(start);
  const endTime = new Date(end);

  const diffMs = endTime - startTime;
  if (diffMs <= 0) return "-";

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${remainingMinutes}m`;
};

const formatElapsedTime = (start) => {
  if (!start) return '00:00';

  const elapsedMs = Date.now() - new Date(start).getTime();
  if (elapsedMs < 0) return '00:00';

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export default function Pickup() {
  const { hasPermission, hasActionPermission } = usePermissions();
  const canView = hasPermission('Pickup (Execution)');
  const canExecute = hasActionPermission('execute_pickup');

  const getDateString = (offset = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
  };

  const formatDateWithDay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
  };

  const tabs = [
    { key: 'yesterday', label: 'Yesterday', date: getDateString(-1) },
    { key: 'today', label: 'Today', date: getDateString(0) },
    { key: 'tomorrow', label: 'Tomorrow', date: getDateString(1) },
    { key: 'day_after', label: 'Day After Tomorrow', date: getDateString(2) }
  ];

  const [activeTab, setActiveTab] = useState('today');

  const [filters, setFilters] = useState({
    status: '',
    depot_id: '',
    start_date: '',
    end_date: '',
    truck_number: '',
    transporter_name: '',
    driver_phone: '',
    company_name: ''
  });
  const [data, setData] = useState([]);
  const [depots, setDepots] = useState([]);
  const [transporters, setTransporters] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [startConfirmRow, setStartConfirmRow] = useState(null);
  const [loadedConfirmOpen, setLoadedConfirmOpen] = useState(false);
  const [loadedConfirmRow, setLoadedConfirmRow] = useState(null);
  const [uploadingTare, setUploadingTare] = useState({});
  const [startLoading, setStartLoading] = useState({});
  const [, setTick] = useState(0);

  const openReject = (row) => {
    setSelectedRow(row);
    setRejectReason("");
    setRejectOpen(true);
  };

  const submitReject = async () => {
    if (!canExecute) {
      toast.error('You do not have permission to reject pickups');
      return;
    }
    if (!rejectReason || rejectReason.trim().length < 10) {
      return toast.error("Reason must be at least 10 characters");
    }

    try {
      await pickupApi.reject(selectedRow.id, {
        reason: rejectReason
      });

      toast.success("Pickup rejected successfully");
      setRejectOpen(false);
      fetchData();
    } catch (err) {
      toast.error(
        err?.response?.data?.detail || "Reject failed"
      );
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const isDateRange =
        filters.start_date || filters.end_date;

      const params = {
        status: filters.status || undefined,
        depot_id: filters.depot_id || undefined,
        truck_number: filters.truck_number || undefined,
        transporter_name: filters.transporter_name || undefined,
        driver_mobile: filters.driver_phone || undefined,
        company_name: filters.company_name || undefined
      };

      if (isDateRange) {
        params.start_date = filters.start_date || undefined;
        params.end_date = filters.end_date || undefined;
      } else {
        const selectedTab = tabs.find(t => t.key === activeTab);
        params.date = selectedTab.date;
      }

      const res = await pickupApi.getAll(params);
      const rows = (res.data || []).slice();
      const statusPriority = { "scheduled": 1, "loading_started": 2, "loaded": 3, "verified": 4, "rescheduled": 5 };
      rows.sort((a, b) => (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99));

      setData(rows);
    } catch (err) {
      toast.error('Failed to load pickup data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadDepots = async () => {
      try {
        const [depotsRes, transportersRes, companiesRes] = await Promise.all([
          depotsApi.getAll(),
          transportersApi.getAll(),
          companiesApi.getAll()
        ]);
        setDepots(depotsRes.data || []);
        setTransporters(transportersRes.data || []);
        setCompanies(companiesRes.data || []);
      } catch (err) {
        console.error('Failed to load filter data:', err);
      }
    };
    loadDepots();
    fetchData();
  }, [activeTab, filters]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (data.some((d) => d.status === 'loading_started')) {
        setTick((prev) => prev + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [data]);

  const updateStatus = async (id, status) => {
    if (!canExecute) {
      toast.error('You do not have permission to execute pickups');
      return;
    }
    try {
      if (status === 'loading_started') {
        setStartLoading((prev) => ({ ...prev, [id]: true }));
      }

      await pickupApi.updateStatus(id, { status });
      fetchData();
    } catch {
      toast.error('Failed to update status');
    } finally {
      if (status === 'loading_started') {
        setStartLoading((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    }
  };

  const openReschedule = (row) => {
    setSelectedRow(row);
    setRescheduleDate("");
    setRescheduleReason("");
    setRescheduleOpen(true);
  };

  const submitReschedule = async () => {
    if (!canExecute) {
      toast.error('You do not have permission to reschedule pickups');
      return;
    }
    if (!rescheduleDate) {
      return toast.error("Date is required");
    }

    if (!rescheduleReason || rescheduleReason.length < 10) {
      return toast.error("Reason must be at least 10 characters");
    }

    try {
      await pickupApi.reschedule(selectedRow.id, {
        new_date: rescheduleDate,
        reason: rescheduleReason
      });

      toast.success("Rescheduled successfully");
      setRescheduleOpen(false);
      fetchData();
    } catch {
      toast.error("Reschedule failed");
    }
  };

  const handleUploadTareSlip = async (pickupId, file, input) => {
    if (!canExecute) {
      toast.error('You do not have permission to upload tare slips');
      return;
    }
    console.log("Uploading tare slip for pickup", pickupId, file);
    if (!file) return;

    setUploadingTare((prev) => ({ ...prev, [pickupId]: true }));

    try {
      const result = await uploadFile(file);
      await pickupApi.uploadTareSlip(pickupId, {
        tare_slip_file_id: result.file_id
      });
      toast.success("Tare slip uploaded successfully");
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to upload tare slip");
    } finally {
      setUploadingTare((prev) => ({ ...prev, [pickupId]: false }));
      if (input) input.value = '';
    }
  };

  const customActions = (row) => {
    console.log('  row.status-------', row);
    const isTodayTab = activeTab === 'today' && !isDateRangeMode;

    return (
      <div className="flex gap-2 flex-nowrap">

        {/* START LOADING ONLY FOR TODAY */}
        {row.status === 'scheduled' && isTodayTab && (
          <Button
            size="sm"
            disabled={startLoading[row.id]}
            onClick={() => {
              setStartConfirmRow(row);
              setStartConfirmOpen(true);
            }}
          >
            <Clock className="w-4 h-4 mr-1" />
            {startLoading[row.id] ? 'Starting...' : 'Start'}
          </Button>
        )}

        {/* MARK LOADED */}
        {row.status === 'loading_started' && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800">
              <Clock className="w-4 h-4" />
              {row.loading_start_time ? formatElapsedTime(row.loading_start_time) : '00:00'}
            </span>
            <Button
              size="sm"
              onClick={() => {
                setLoadedConfirmRow(row);
                setLoadedConfirmOpen(true);
              }}
            >
              <Truck className="w-4 h-4 mr-1" />
              Loaded
            </Button>
          </div>
        )}

        {/* RESCHEDULE */}
        {(row.status === 'scheduled') && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openReschedule(row)}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reschedule
          </Button>
        )}

        {/* REJECT */}
        {(row.status === 'scheduled' || row.status === 'loading_started') && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => openReject(row)}
            >
              Reject
            </Button>
          )}


        {(row.status === 'loading_started' || row.status === 'loaded' || row.status === 'scheduled') && (
          <div className="flex items-center gap-2">
            {row.tare_slip_file_id ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(getFileUrl(row.tare_slip_file_id), '_blank')}
              >
                <Eye className="w-4 h-4 mr-1" />
                View Tare Slip
              </Button>
            ) : (
              <>
                {/* Hidden input field */}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  capture="environment"
                  className="hidden"
                  id={`tare-slip-upload-${row.id}`}
                  onChange={(e) => handleUploadTareSlip(row.id, e.target.files?.[0], e.target)}
                />

                {/* Trigger button using native DOM selection via ID instead of label wrapper */}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={uploadingTare[row.id]}
                  onClick={() => {
                    const inputEl = document.getElementById(`tare-slip-upload-${row.id}`);
                    if (inputEl) inputEl.click();
                  }}
                >
                  {uploadingTare[row.id] ? 'Uploading...' : 'Upload Tare Slip'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // 📊 Stats (same pattern as Liftings)
  const stats = {
    total: data.length,
    scheduled: data.filter(d => d.status === 'scheduled').length,
    loading: data.filter(d => d.status === 'loading_started').length,
    loaded: data.filter(d => d.status === 'loaded').length,
    verified: data.filter(d => d.status === 'verified').length,
    rescheduled: data.filter(d => d.status === 'rescheduled').length
  };

  const filteredData = React.useMemo(() => {
    let result = data;
    if (filters.depot_id) {
      result = result.filter(item => item.depot_id === filters.depot_id);
    }
    if (filters.truck_number) {
      const val = filters.truck_number.toLowerCase();
      result = result.filter(item => item.truck_number?.toLowerCase().includes(val));
    }
    if (filters.transporter_name) {
      const val = filters.transporter_name.toLowerCase();
      result = result.filter(item => item.transporter_name?.toLowerCase().includes(val));
    }
    if (filters.driver_phone) {
      result = result.filter(item => item.driver_phone?.includes(filters.driver_phone));
    }
    if (filters.company_name) {
      const val = filters.company_name.toLowerCase();
      result = result.filter(item => item.company_name?.toLowerCase().includes(val));
    }
    return result;
  }, [data, filters]);

  if (!canView) {
    return (
      <PageLayout title="Pickup">
        <div className="p-8 text-center text-gray-500">
          You do not have permission.
        </div>
      </PageLayout>
    );
  }

  const isDateRangeMode = filters.start_date || filters.end_date;

  return (
    <PageLayout
      title="Dispatch Info"
      subtitle="Depot truck dispatch execution"

    >
      {/* <div className="flex flex-wrap gap-2 items-center">

        <select
          className="border rounded-md h-10 px-3 text-sm"
          value={filters.status}
          onChange={(e) =>
            setFilters(prev => ({
              ...prev,
              status: e.target.value
            }))
          }
        >
          <option value="">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="loading_started">Loading Started</option>
          <option value="loaded">Loaded</option>
          <option value="verified">Verified</option>
          <option value="rescheduled">Rescheduled</option>
          <option value="rejected">Rejected</option>
        </select>

        <Input
          type="date"
          value={filters.start_date}
          onChange={(e) =>
            setFilters(prev => ({
              ...prev,
              start_date: e.target.value
            }))
          }
        />

        <Input
          type="date"
          value={filters.end_date}
          onChange={(e) =>
            setFilters(prev => ({
              ...prev,
              end_date: e.target.value
            }))
          }
        />

        {isDateRangeMode && (
          <Button
            variant="outline"
            onClick={() => {
              setFilters({
                status: '',
                start_date: '',
                end_date: ''
              });

              setActiveTab('today');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div> */}

      <PickupFilterPanel
        filters={filters}
        setFilters={setFilters}
        isDateRangeMode={isDateRangeMode}
        depots={depots}
        transporters={transporters}
        companies={companies}
      />
      {!isDateRangeMode && (
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? 'default' : 'outline'}
              onClick={() => setActiveTab(tab.key)}
              className="flex flex-col items-center justify-center h-auto py-2 px-3"
            >
              <span className="font-medium">{tab.label}</span>
              <span className="text-xs opacity-75">{formatDateWithDay(tab.date)}</span>
            </Button>
          ))}
        </div>
      )}

      <PickupStatsCards
        stats={stats}
        activeStatus={filters.status}
        onStatusChange={(status) => setFilters((prev) => ({
          ...prev,
          status
        }))}
      />
      <PickupDataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        customActions={customActions}
        emptyMessage="No pickups scheduled for this date"
      />

      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Pickup</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>New Date *</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>

            <div>
              <Label>Reason *</Label>
              <textarea
                className="w-full border rounded-md p-2 text-sm"
                rows={3}
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Minimum 10 characters"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitReschedule}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Pickup</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Reason *</Label>

              <textarea
                className="w-full border rounded-md p-2 text-sm"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={submitReject}
            >
              Reject Pickup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={startConfirmOpen} onOpenChange={setStartConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Confirm Start Loading</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
              You have clicked the start button to load Truck No. <strong>{startConfirmRow?.truck_number || '-'}</strong>. Please Confirm
            </div>
            <SlideToConfirm
              label="Slide to Start Loading →"
              onConfirm={() => {
                if (startConfirmRow) updateStatus(startConfirmRow.id, 'loading_started');
                setStartConfirmOpen(false);
                setStartConfirmRow(null);
              }}
            />
            <div className="flex justify-center">
              <Button
                variant="ghost"
                className="text-slate-500"
                onClick={() => {
                  setStartConfirmOpen(false);
                  setStartConfirmRow(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={loadedConfirmOpen} onOpenChange={setLoadedConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Confirm Loading Complete</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
              Is this vehicle <strong>{loadedConfirmRow?.truck_number || '-'}</strong> loaded successfully? Please confirm
            </div>
            <SlideToConfirm
              label="Slide to Confirm Loaded →"
              onConfirm={() => {
                if (loadedConfirmRow) updateStatus(loadedConfirmRow.id, 'loaded');
                setLoadedConfirmOpen(false);
                setLoadedConfirmRow(null);
              }}
            />
            <div className="flex justify-center">
              <Button
                variant="ghost"
                className="text-slate-500"
                onClick={() => {
                  setLoadedConfirmOpen(false);
                  setLoadedConfirmRow(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}