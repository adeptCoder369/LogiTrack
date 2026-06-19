import React, { useMemo, useState } from 'react';
import {
  FileText,
  Layers,
  FileCheck,
  CalendarDays,
  History,
  Rewind,
  TrendingUp,
  Package,
} from 'lucide-react';

import ProductBreakdownTable from './ProductBreakdownTable';


// ─── Table Cell ───────────────────────────────────────────────────────────────
function Num({ v, color }) {
  return (
    <td
      style={{
        padding: '11px 14px',
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        borderRight: '0.5px solid #E5E7EB',
      }}
      className="text-xs"
    >
      {Number.isFinite(v) ? v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
    </td>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductMetricsSection({ metricsRows = [] }) {
  const [expandedProductId, setExpandedProductId] = useState(null);

  const headerStyle = {
    padding: '13px 14px',
    textAlign: 'center',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#334155',
    borderBottom: '0.5px solid #E5E7EB',
    borderRight: '0.5px solid #E5E7EB',
  };

  const dispatchCols = [
    { key: 'dispatch_today_qty', label: 'Today', icon: CalendarDays, color: '#085041' },
    { key: 'dispatch_yesterday_qty', label: 'Yesterday', icon: History, color: '#0F6E56' },
    { key: 'dispatch_day_before_yesterday_qty', label: 'Day Before', icon: Rewind, color: '#1D9E75' },
  ];

  const productTableRows = useMemo(() => {
    return metricsRows.map((row, idx) => ({
      row,
      idx,
      rowKey: row.product_id ?? row.product_name ?? idx,
    }));
  }, [metricsRows]);

  const toggleExpanded = (productId) => {
    setExpandedProductId((current) => (current === productId ? null : productId));
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Manrope', system-ui, sans-serif" }}>



    



      <ProductBreakdownTable
        metricsRows={metricsRows}
        dispatchCols={dispatchCols}
        expandedProductId={expandedProductId}
        toggleExpanded={toggleExpanded}
      />
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
import { ChevronRight, MapPin } from 'lucide-react'; // Clear, professional inventory/depot signals

function TableRow({ row, dispatchCols, idx, onClick, isExpanded = false }) {
  const [hovered, setHovered] = React.useState(false);

  // Safely extract the number of depots holding this product from your nested data structure
  // (e.g., matching row.depots, row.liftings, or inventory locations)
  const depotCount = row.depots?.length || row.liftings?.length || 0;

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        // Give expanded rows a distinct, stable accent color so they frame the child rows beautifully
        background: isExpanded
          ? '#F0F7FF'
          : hovered
            ? '#F8FAFF'
            : idx % 2 === 0 ? '#fff' : '#FAFAFA',
        transition: 'all 0.15s ease',
        boxShadow: isExpanded ? 'inset 3px 0px 0px #3B82F6' : 'none', // Left accent border indicator
        borderBottom: isExpanded ? '1px solid #BFDBFE' : '0.5px solid #F3F4F6',
      }}
    >
      {/* Product Name Column with interactive Depot Nesting UI */}
<td
        style={{
          padding: '14px 16px',
          fontWeight: 600,
          color: isExpanded ? '#1E40AF' : '#111827',
          borderRight: '0.5px solid #E5E7EB',
          whiteSpace: 'nowrap',
        }}
        className="text-sm"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Animated Chevron Arrow */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                color: isExpanded ? '#3B82F6' : '#9CA3AF',
              }}
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </div>

            {/* Contextual Depot Pin Icon */}
            <MapPin
              size={15}
              style={{
                color: isExpanded ? '#3B82F6' : '#9CA3AF',
                opacity: isExpanded ? 1 : 0.7,
                transition: 'color 0.2s'
              }}
            />

            {/* Product Name Text */}
            <span style={{ tracking: '-0.01em' }}>
              {row.product_name || 'Unknown'}
            </span>
          </div>

          {/* Elegant Depot Distribution Badge */}
          {depotCount > 0 && (
            <div
              style={{
                fontWeight: 600,
                color: isExpanded ? '#1D4ED8' : '#4B5563',
                background: isExpanded ? '#DBEAFE' : '#E5E7EB',
                padding: '2px 8px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s',
              }}
              title={`${depotCount} Depots holding stock`}
              className="text-xs"
            >
              <span>{depotCount}</span>
              <span className="text-[10px] font-normal opacity-80">
                {depotCount === 1 ? 'depot' : 'depots'}
              </span>
            </div>
          )}
        </div>
      </td>

      {/* Main Aggregated Metrics Columns */}
      <Num v={row.remaining_do_qty ?? 0} color={isExpanded ? '#1D4ED8' : '#185FA5'} />
      <Num v={row.available_stock_qty ?? 0} color={isExpanded ? '#B45309' : '#BA7517'} />
      <Num v={row.remaining_po_qty ?? 0} color={isExpanded ? '#6D28D9' : '#534AB7'} />

      {/* Dispatch Timeline Columns */}
      {dispatchCols.map(({ key }, i) => (
        <td
          key={key}
          style={{
            padding: '14px 14px',
            textAlign: 'right',
            fontVariantNumeric: 'tabular-nums',
            color: isExpanded ? '#047857' : '#0F6E56',
            fontWeight: isExpanded ? 600 : 500,
            borderLeft: i === 0 ? '0.5px solid #9FE1CB' : '0.5px solid #D1FAE5',
            background: isExpanded
              ? `rgba(209, 250, 229, ${0.5 - i * 0.12})`
              : hovered
                ? '#D1FAE5'
                : `rgba(225,245,238,${0.6 - i * 0.18})`,
            transition: 'background 0.12s, color 0.12s',
            opacity: 1 - i * 0.12,
          }}
          className="text-sm"
        >
          {(row[key] ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </td>
      ))}
    </tr>
  );
}