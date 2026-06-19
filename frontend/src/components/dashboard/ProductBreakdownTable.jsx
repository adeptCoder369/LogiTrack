import React from 'react';
import { Package, CalendarDays, History, Rewind, FileText, FileCheck, MapPin, ChevronRight, Layers } from 'lucide-react';

function MetricCell({ value, color, bg, isParent = false }) {
  return (
    <td
      style={{
        padding: '14px 16px',
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: 700,
        color: color,
        background: bg || 'transparent',
        borderRight: '1px solid #E5E7EB',
        transition: 'all 0.15s ease',
      }}
      className={isParent ? 'text-sm' : 'text-xs'}
    >
      {value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </td>
  );
}

function TableRow({ row, dispatchCols, idx, onClick, isExpanded }) {
  const [hovered, setHovered] = React.useState(false);
  const depotRows = row.stock_by_depot || [];
  const depotCount = depotRows.length;

  return (
    <tr
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        cursor: 'pointer',
        background: isExpanded
          ? '#F1F5F9'
          : hovered
            ? '#F8FAFF'
            : idx % 2 === 0 ? '#ffffff' : '#FAFAFA',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isExpanded ? 'inset 4px 0px 0px #2563EB' : 'none',
        borderBottom: isExpanded ? '1px solid #CBD5E1' : '1px solid #E5E7EB',
      }}
    >
      <td
        style={{
          padding: '14px 16px',
          fontWeight: 600,
          color: isExpanded ? '#1E3A8A' : '#0F172A',
          borderRight: '1px solid #E5E7EB',
          whiteSpace: 'nowrap',
          textAlign: 'center',
        }}
        className="text-sm"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                color: isExpanded ? '#2563EB' : '#94A3B8',
              }}
            >
              <ChevronRight size={16} strokeWidth={2.5} />
            </div>
            <span style={{ letterSpacing: '-0.01em' }}>{row.product_name || 'Unknown'}</span>
          </div>
          {depotCount > 0 && (
            <div
              style={{
                fontWeight: 700,
                color: isExpanded ? '#1D4ED8' : '#475569',
                background: isExpanded ? '#DBEAFE' : '#E2E8F0',
                padding: '2px 8px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.15s ease',
              }}
              className="text-xs"
            >
              <MapPin size={11} strokeWidth={2.5} />
              <span>{depotCount}</span>
            </div>
          )}
        </div>
      </td>

      <MetricCell value={row.remaining_do_qty ?? 0} color="#1E40AF" bg={isExpanded ? '#E0F2FE' : hovered ? '#EFF6FF' : ''} isParent />
      <MetricCell value={row.available_stock_qty ?? 0} color="#B45309" bg={isExpanded ? '#FEF3C7' : hovered ? '#FFFBEB' : ''} isParent />
      <MetricCell value={row.remaining_po_qty ?? 0} color="#6D28D9" bg={isExpanded ? '#F3E8FF' : hovered ? '#F5F3FF' : ''} isParent />

      {dispatchCols.map(({ key }, i) => {
        const textColors = ['#047857', '#065F46', '#0F5132'];
        const activeNestedBg = [
          'rgba(16, 185, 129, 0.18)',
          'rgba(16, 185, 129, 0.12)',
          'rgba(16, 185, 129, 0.05)'
        ];
        const defaultBg = [
          'rgba(209, 250, 229, 0.5)',
          'rgba(209, 250, 229, 0.3)',
          'rgba(209, 250, 229, 0.15)'
        ];

        return (
          <td
            key={key}
            style={{
              padding: '14px 16px',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: i === 0 ? 700 : 500,
              color: textColors[i],
              borderRight: i < 2 ? '1px solid #D1FAE5' : 'none',
              background: isExpanded ? activeNestedBg[i] : hovered ? '#D1FAE5' : defaultBg[i],
              opacity: isExpanded ? 1 : 1 - i * 0.15,
              transition: 'all 0.15s ease',
            }}
            className="text-sm"
          >
            {(row[key] ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        );
      })}
    </tr>
  );
}

export default function ProductBreakdownTable({
  metricsRows = [],
  dispatchCols = [],
  expandedProductId,
  toggleExpanded
}) {
  return (
    <div style={{ marginTop: 24, marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContext: 'center', background: '#F1F5F9', padding: 6, borderRadius: 8 }}>
          <Package size={16} color="#475569" strokeWidth={2.5} />
        </div>
        <span style={{ fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#334155' }} className="text-sm">
          Product Allocation & Distribution Logistics
        </span>
      </div>

      <div
        style={{
          border: '1px solid #CBD5E1',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
          background: '#ffffff',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr style={{ background: '#F8FAFF', borderBottom: '1px solid #E2E8F0' }}>
                <th
                  rowSpan={2}
                  style={{
                    padding: '14px 16px',
                    textAlign: 'center',
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#475569',
                    borderRight: '1px solid #E2E8F0',
                    width: '24%',
                  }}
                  className="text-sm"
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Package size={12} />
                    Product Line
                  </span>
                </th>

                {[
                  { label: 'Remaining DO Qty', icon: FileText, color: '#1E40AF', bg: '#EFF6FF' },
                  { label: 'Available Stock', icon: Layers, color: '#B45309', bg: '#FFFBEB' },
                  { label: 'Remaining PO Qty', icon: FileCheck, color: '#6D28D9', bg: '#F5F3FF' },
                ].map(({ label, icon: Icon, color, bg }) => (
                  <th
                    key={label}
                    rowSpan={2}
                    style={{
                      padding: '14px 16px',
                      textAlign: 'center',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color,
                      background: bg,
                      borderRight: '1px solid #E2E8F0',
                    }}
                    className="text-sm"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Icon size={12} />
                      {label}
                    </span>
                  </th>
                ))}

                <th
                  colSpan={3}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'center',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: '#065F46',
                    background: '#D1FAE5',
                    borderBottom: '1px solid #A7F3D0',
                  }}
                  className="text-sm"
                >
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CalendarDays size={13} strokeWidth={2.5} />
                    Dispatch Timeline
                  </div>
                </th>
              </tr>

              <tr style={{ background: '#ECFDF5', borderBottom: '1px solid #A7F3D0' }}>
                {dispatchCols.map(({ key, label, icon: Icon }, i) => (
                  <th
                    key={key}
                    style={{
                      padding: '8px 16px',
                      textAlign: 'center',
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: '#047857',
                      borderRight: i < 2 ? '1px solid #A7F3D0' : 'none',
                      opacity: 1 - i * 0.12,
                    }}
                    className="text-xs"
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Icon size={12} />
                      {label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody style={{ divideY: '1px solid #E2E8F0' }}>
              {metricsRows.length > 0 ? (
                metricsRows.map((row, idx) => {
                  const rowId = row.product_id ?? row.product_name ?? idx;
                  const isExpanded = expandedProductId === row.product_id;
                  const depotRows = row.stock_by_depot || [];

                  return (
                    <React.Fragment key={rowId}>
                      <TableRow
                        row={row}
                        dispatchCols={dispatchCols}
                        idx={idx}
                        onClick={() => toggleExpanded(row.product_id)}
                        isExpanded={isExpanded}
                      />

                      {isExpanded && (
                        <tr style={{ background: '#F8FAFF' }}>
                          <td colSpan={7} style={{ padding: '20px 24px', borderBottom: '1px solid #CBD5E1' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <Layers size={14} color="#3B82F6" strokeWidth={2.5} />
                                  <span style={{ fontWeight: 700, color: '#1E293B' }} className="text-sm">
                                    Depot Distribution Breakdown
                                  </span>
                                </div>
                                <div style={{ fontWeight: 500, color: '#64748B' }} className="text-sm">
                                    Aggregated Stock Across <strong style={{ color: '#0F172A' }}>{depotRows.length}</strong> Depots:&nbsp;&nbsp;
                                    <strong style={{ color: '#2563EB', fontVariantNumeric: 'tabular-nums' }}>
                                      {depotRows.reduce((sum, item) => sum + (item.available_quantity || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MT
                                    </strong>
                                  </div>
                              </div>

                              {depotRows.length > 0 ? (
                                <div style={{ overflow: 'hidden', border: '1px solid #E2E8F0', borderRadius: 10, background: '#ffffff' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                      <tr style={{ background: '#F8FAFF', borderBottom: '1px solid #E2E8F0' }}>
                                        <th rowSpan={2} style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em', background: '#F8FAFF' }} className="text-sm">Depot Name</th>
                                        <th rowSpan={2} style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.02em', background: '#FFFDF4' }} className="text-sm">Available Balance (MT)</th>
                                        <th colSpan={3} style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 800, color: '#065F46', background: '#ECFDF5', borderLeft: '1px solid #E2E8F0' }}>
                                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                            <CalendarDays size={12} />
                                            Dispatch Timeline
                                          </span>
                                        </th>
                                      </tr>
                                      <tr style={{ background: '#ECFDF5', borderBottom: '1px solid #E2E8F0' }}>
                                        <th style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 700, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.02em' }} className="text-xs">
                                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            <CalendarDays size={12} />
                                            Today
                                          </span>
                                        </th>
                                        <th style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.02em' }} className="text-xs">
                                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            <History size={12} />
                                            Yesterday
                                          </span>
                                        </th>
                                        <th style={{ padding: '8px 16px', textAlign: 'center', fontWeight: 700, color: '#0F5132', textTransform: 'uppercase', letterSpacing: '0.02em' }} className="text-xs">
                                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            <Rewind size={12} />
                                            Day Before
                                          </span>
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {depotRows.map((depot, dIdx) => (
                                        <tr key={depot.depot_id ?? dIdx} style={{ borderBottom: dIdx < depotRows.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                                          <td style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }} className="text-sm">
                                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#94A3B8' }} />
                                            {depot.depot_name || 'Unknown Hub'}
                                          </td>
                                          <td style={{ padding: '10px 16px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }} className="text-sm">
                                            {(depot.available_quantity ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </td>
                                          {[
                                            { val: depot.dispatch_today_qty ?? 0, color: '#047857' },
                                            { val: depot.dispatch_yesterday_qty ?? 0, color: '#065F46' },
                                            { val: depot.dispatch_day_before_yesterday_qty ?? 0, color: '#0F5132' }
                                          ].map((d, di) => {
                                            const activeBg = ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.08)', 'rgba(16,185,129,0.04)'];
                                            const neutralBg = ['rgba(209,250,229,0.18)', 'rgba(209,250,229,0.12)', 'rgba(209,250,229,0.06)'];
                                            const bg = d.val > 0 ? activeBg[di] : neutralBg[di];
                                            return (
                                              <td key={di} style={{ padding: '10px 16px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', background: bg }} className="text-sm">
                                                {d.val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div style={{ padding: '16px', textAlign: 'center', fontStyle: 'italic', background: '#ffffff', borderRadius: 10, border: '1px solid #E2E8F0' }} className="text-sm text-gray-400">
                                  No registered warehouse/depot allocations recorded for this line.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '64px 24px', textAlign: 'center', fontStyle: 'italic' }} className="text-sm text-gray-400">
                    No localized logistics matrix records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}