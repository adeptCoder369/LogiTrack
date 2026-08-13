// import React from 'react';
// import { Input } from '../ui/input';
// import { Button } from '../ui/button';
// import { Calendar, X, ListFilter, Warehouse, Truck, Building2, Phone, User } from 'lucide-react';

// export default function PickupFilterPanel({
//   filters,
//   setFilters,
//   isDateRangeMode,
//   setActiveTab,
//   depots = [],
//   transporters = [],
//   companies = []
// }) {

//   const hasActiveFilters = filters.status || filters.source_id || filters.start_date || filters.end_date ||
//     filters.truck_number || filters.transporter_name || filters.driver_phone;

//   const handleClearFilters = () => {
//     setFilters({
//       status: '',
//       source_id: '',
//       source_type: '',
//       start_date: '',
//       end_date: '',
//       truck_number: '',
//       transporter_name: '',
//       driver_phone: ''
//     });
//     if (setActiveTab) {
//       setActiveTab('today');
//     }
//   };

//   const sanitizeDateValue = (dateVal) => {
//     if (!dateVal) return '';
//     if (typeof dateVal === 'string' && dateVal.includes('T')) {
//       return dateVal.split('T')[0];
//     }
//     return dateVal;
//   };

//   const mergedSources = [
//     ...depots.map((d) => ({
//       id: d.id || d._id,
//       name: d.name || d.depot_name,
//       type: 'Depot'
//     })),
//     ...companies.map((c) => ({
//       id: c.id,
//       name: c.name,
//       type: 'Company'
//     }))
//   ];

//   return (
//     <div className="bg-white p-4 border border-slate-200/80 rounded-xl shadow-sm flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-4 mb-4">

//       <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-4 justify-start flex-1">

//         <div className="flex flex-col gap-1.5 w-full sm:w-[200px]">
//           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
//             Source
//           </span>
//           <div className="relative w-full">
//             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
//               <Warehouse className="w-4 h-4" />
//             </span>
//             <select
//               className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg h-10 pl-9 pr-7 text-xs font-semibold text-slate-700 outline-none transition-colors appearance-none cursor-pointer shadow-sm"
//               value={filters.source_id || ''}
//               onChange={(e) => {
//                 const val = e.target.value;
//                 const source = mergedSources.find((s) => s.id === val);
//                 setFilters(prev => ({
//                   ...prev,
//                   source_id: val,
//                   source_type: source?.type || ''
//                 }));
//               }}
//             >
//               <option value="">All Sources</option>
//               {mergedSources.map((source) => (
//                 <option key={`${source.type}-${source.id}`} value={source.id}>
//                   [{source.type}] {source.name}
//                 </option>
//               ))}
//             </select>
//             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[9px]">▼</span>
//           </div>
//         </div>

//         <div className="flex flex-col gap-1.5 w-full sm:w-[180px]">
//           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
//             Filter Status
//           </span>
//           <div className="relative w-full">
//             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
//               <ListFilter className="w-4 h-4" />
//             </span>
//             <select
//               className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg h-10 pl-9 pr-7 text-xs font-semibold text-slate-700 outline-none transition-colors appearance-none cursor-pointer shadow-sm"
//               value={filters.status || ''}
//               onChange={(e) =>
//                 setFilters(prev => ({
//                   ...prev,
//                   status: e.target.value
//                 }))
//               }
//             >
//               <option value="">All Statuses</option>
//               <option value="scheduled">Scheduled</option>
//               <option value="loading_started">Loading Started</option>
//               <option value="loaded">Loaded</option>
//               <option value="weightment_done">Weightment Done</option>
//               <option value="verified">Verified</option>
//               <option value="rescheduled">Rescheduled</option>
//               <option value="rejected">Rejected</option>
//             </select>
//             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[9px]">▼</span>
//           </div>
//         </div>

//         <div className="flex flex-col gap-1.5 w-full sm:w-auto">
//           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
//             Scheduled Date Range
//           </span>
//           <div className="flex items-center gap-2 w-full sm:w-auto">
//             <div className="relative flex-1 sm:w-[155px]">
//               <Input
//                 type="date"
//                 className="pr-2 h-10 border-slate-200 text-slate-700 font-semibold rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 w-full cursor-pointer relative text-xs shadow-sm"
//                 value={sanitizeDateValue(filters.start_date)}
//                 onChange={(e) =>
//                   setFilters(prev => ({
//                     ...prev,
//                     start_date: e.target.value
//                   }))
//                 }
//               />
//             </div>
//             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-0.5 select-none">to</span>
//             <div className="relative flex-1 sm:w-[155px]">
//               <Input
//                 type="date"
//                 className="pr-2 h-10 border-slate-200 text-slate-700 font-semibold rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 w-full cursor-pointer relative text-xs shadow-sm"
//                 value={sanitizeDateValue(filters.end_date)}
//                 onChange={(e) =>
//                   setFilters(prev => ({
//                     ...prev,
//                     end_date: e.target.value
//                   }))
//                 }
//               />
//             </div>
//           </div>
//         </div>

//         <div className="flex flex-col gap-1.5 w-full sm:w-[180px]">
//           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
//             Truck
//           </span>
//           <div className="relative w-full">
//             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
//               <Truck className="w-4 h-4" />
//             </span>
//             <Input
//               placeholder="Search truck no..."
//               className="pl-9 h-10 border-slate-200 text-xs font-semibold rounded-lg shadow-sm"
//               value={filters.truck_number || ''}
//               onChange={(e) =>
//                 setFilters(prev => ({ ...prev, truck_number: e.target.value }))
//               }
//             />
//           </div>
//         </div>

//         <div className="flex flex-col gap-1.5 w-full sm:w-[180px]">
//           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
//             Transporter
//           </span>
//           <div className="relative w-full">
//             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
//               <Building2 className="w-4 h-4" />
//             </span>
//             <select
//               className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg h-10 pl-9 pr-7 text-xs font-semibold text-slate-700 outline-none transition-colors appearance-none cursor-pointer shadow-sm"
//               value={filters.transporter_name || ''}
//               onChange={(e) =>
//                 setFilters(prev => ({ ...prev, transporter_name: e.target.value }))
//               }
//             >
//               <option value="">All Transporters</option>
//               {transporters.map((t) => (
//                 <option key={t.id} value={t.name}>{t.name}</option>
//               ))}
//             </select>
//             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[9px]">▼</span>
//           </div>
//         </div>

//         <div className="flex flex-col gap-1.5 w-full sm:w-[180px]">
//           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
//             Driver Mobile No.
//           </span>
//           <div className="relative w-full">
//             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
//               <Phone className="w-4 h-4" />
//             </span>
//             <Input
//               placeholder="Search driver mobile..."
//               className="pl-9 h-10 border-slate-200 text-xs font-semibold rounded-lg shadow-sm"
//               value={filters.driver_phone || ''}
//               onChange={(e) =>
//                 setFilters(prev => ({ ...prev, driver_phone: e.target.value }))
//               }
//             />
//           </div>
//         </div>

//       </div>

//       {(isDateRangeMode || hasActiveFilters) && (
//         <div className="pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 flex justify-end lg:h-10 items-center">
//           <Button
//             variant="ghost"
//             size="sm"
//             onClick={handleClearFilters}
//             className="h-10 px-4 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold rounded-lg gap-2 text-[10px] uppercase tracking-wider transition-colors"
//           >
//             <X className="w-3.5 h-3.5" />
//             Clear Filters
//           </Button>
//         </div>
//       )}

//     </div>
//   );
// }



import React, { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Calendar, X, ListFilter, Warehouse, Truck, Building2, Phone, SlidersHorizontal, ChevronDown } from 'lucide-react';

export default function PickupFilterPanel({
  filters,
  setFilters,
  isDateRangeMode,
  setActiveTab,
  depots = [],
  transporters = [],
  companies = []
}) {
  const [isOpen, setIsOpen] = useState(false);

  const hasActiveFilters = Boolean(
    filters.status || filters.source_id || filters.start_date || filters.end_date ||
    filters.truck_number || filters.transporter_name || filters.driver_phone
  );

  const handleClearFilters = () => {
    setFilters({
      status: '',
      source_id: '',
      source_type: '',
      start_date: '',
      end_date: '',
      truck_number: '',
      transporter_name: '',
      driver_phone: ''
    });
    if (setActiveTab) {
      setActiveTab('today');
    }
  };

  const sanitizeDateValue = (dateVal) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string' && dateVal.includes('T')) {
      return dateVal.split('T')[0];
    }
    return dateVal;
  };

  const mergedSources = [
    ...depots.map((d) => ({
      id: d.id || d._id,
      name: d.name || d.depot_name,
      type: 'Depot'
    })),
    ...companies.map((c) => ({
      id: c.id,
      name: c.name,
      type: 'Company'
    }))
  ];

  return (
    <div className="bg-white p-4 border border-slate-200/80 rounded-xl shadow-sm flex flex-col gap-4 mb-4 transition-all duration-200">
      
      {/* Header Bar with Toggle for Small Devices */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-slate-700 font-bold text-xs tracking-wider uppercase sm:cursor-default"
        >
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="flex h-2 w-2 rounded-full bg-slate-900" />
          )}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 sm:hidden ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {(isDateRangeMode || hasActiveFilters) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-8 px-3 text-slate-500 hover:text-rose-600 hover:bg-rose-50 font-bold rounded-lg gap-1.5 text-[10px] uppercase tracking-wider transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Filter Inputs Container - Collapsible on small devices */}
      <div className={`${isOpen ? 'flex' : 'hidden sm:flex'} flex-col lg:flex-row items-stretch lg:items-end justify-between gap-4`}>
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-4 justify-start flex-1">

          <div className="flex flex-col gap-1.5 w-full sm:w-[200px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
              Source
            </span>
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Warehouse className="w-4 h-4" />
              </span>
              <select
                className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg h-10 pl-9 pr-7 text-xs font-semibold text-slate-700 outline-none transition-colors appearance-none cursor-pointer shadow-sm"
                value={filters.source_id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const source = mergedSources.find((s) => s.id === val);
                  setFilters(prev => ({
                    ...prev,
                    source_id: val,
                    source_type: source?.type || ''
                  }));
                }}
              >
                <option value="">All Sources</option>
                {mergedSources.map((source) => (
                  <option key={`${source.type}-${source.id}`} value={source.id}>
                    [{source.type}] {source.name}
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[9px]">▼</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-[180px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
              Filter Status
            </span>
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ListFilter className="w-4 h-4" />
              </span>
              <select
                className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg h-10 pl-9 pr-7 text-xs font-semibold text-slate-700 outline-none transition-colors appearance-none cursor-pointer shadow-sm"
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters(prev => ({
                    ...prev,
                    status: e.target.value
                  }))
                }
              >
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="loading_started">Loading Started</option>
                <option value="loaded">Loaded</option>
                <option value="weightment_done">Weightment Done</option>
                <option value="verified">Verified</option>
                <option value="rescheduled">Rescheduled</option>
                <option value="rejected">Rejected</option>
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[9px]">▼</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
              Scheduled Date Range
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-[155px]">
                <Input
                  type="date"
                  className="pr-2 h-10 border-slate-200 text-slate-700 font-semibold rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 w-full cursor-pointer relative text-xs shadow-sm"
                  value={sanitizeDateValue(filters.start_date)}
                  onChange={(e) =>
                    setFilters(prev => ({
                      ...prev,
                      start_date: e.target.value
                    }))
                  }
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-0.5 select-none">to</span>
              <div className="relative flex-1 sm:w-[155px]">
                <Input
                  type="date"
                  className="pr-2 h-10 border-slate-200 text-slate-700 font-semibold rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 w-full cursor-pointer relative text-xs shadow-sm"
                  value={sanitizeDateValue(filters.end_date)}
                  onChange={(e) =>
                    setFilters(prev => ({
                      ...prev,
                      end_date: e.target.value
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-[180px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
              Truck
            </span>
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Truck className="w-4 h-4" />
              </span>
              <Input
                placeholder="Search truck no..."
                className="pl-9 h-10 border-slate-200 text-xs font-semibold rounded-lg shadow-sm"
                value={filters.truck_number || ''}
                onChange={(e) =>
                  setFilters(prev => ({ ...prev, truck_number: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-[180px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
              Transporter
            </span>
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Building2 className="w-4 h-4" />
              </span>
              <select
                className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-400 rounded-lg h-10 pl-9 pr-7 text-xs font-semibold text-slate-700 outline-none transition-colors appearance-none cursor-pointer shadow-sm"
                value={filters.transporter_name || ''}
                onChange={(e) =>
                  setFilters(prev => ({ ...prev, transporter_name: e.target.value }))
                }
              >
                <option value="">All Transporters</option>
                {transporters.map((t) => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[9px]">▼</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 w-full sm:w-[180px]">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 select-none">
              Driver Mobile No.
            </span>
            <div className="relative w-full">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Phone className="w-4 h-4" />
              </span>
              <Input
                placeholder="Search driver mobile..."
                className="pl-9 h-10 border-slate-200 text-xs font-semibold rounded-lg shadow-sm"
                value={filters.driver_phone || ''}
                onChange={(e) =>
                  setFilters(prev => ({ ...prev, driver_phone: e.target.value }))
                }
              />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}