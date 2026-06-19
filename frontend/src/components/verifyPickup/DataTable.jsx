import React from 'react';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye } from 'lucide-react';

export const VerifyPickupOrdersDataTable = ({
  columns,
  data,
  onEdit,
  onDelete,
  onView,
  customActions,
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon: EmptyIcon
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-sm font-medium text-slate-500 animate-pulse">Loading items...</div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
        {EmptyIcon && <EmptyIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />}
        <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  const hasActions = onEdit || onDelete || onView || customActions;

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Scroll Container: 
        max-h-[600px] holds the height bounds so the layout vertical scroll triggers.
        overflow-x-auto keeps rows from breaking screen edges when columns carry wide datasets.
      */}
      <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="sticky top-0 z-10 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider px-4 py-3.5 border-b border-gray-200 whitespace-nowrap shadow-[inset_0_-1px_0_rgba(226,232,240,1)]"
                >
                  {col.label}
                </th>
              ))}
              {hasActions && (
                <th className="sticky top-0 z-10 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider px-4 py-3.5 border-b border-gray-200 text-right whitespace-nowrap shadow-[inset_0_-1px_0_rgba(226,232,240,1)]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-100 bg-white">
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className="hover:bg-slate-50/70 transition-colors group"
                data-testid={`table-row-${idx}`}
              >
                {columns.map((col) => {
                  let cellContent;

                  if (col.render) {
                    cellContent = col.render(row[col.key], row);
                  } else if (col.isProgress || col.key === 'dispatched' || col.key === 'progress') {
                    const percentage = Math.min(Math.max(Number(row[col.key]) || 0, 0), 100);
                    const barColor = percentage === 100 ? 'bg-green-600' : 'bg-blue-600';

                    cellContent = (
                      <div className="w-full max-w-[140px] min-w-[100px]">
                        <div className="flex items-center justify-between mb-1 text-xs font-semibold text-slate-700">
                          <span>{percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/50">
                          <div
                            className={`${barColor} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  } else {
                    cellContent = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '-';
                  }

                  return (
                    <td
                      key={col.key}
                      className="px-4 py-3 text-sm text-slate-700 font-medium whitespace-nowrap align-middle"
                    >
                      {cellContent}
                    </td>
                  );
                })}

                {hasActions && (
                  <td className="px-4 py-3 text-sm whitespace-nowrap text-right align-middle">
                    <div className="flex justify-end items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                      {customActions && customActions(row)}
                      
                      {onView && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                          onClick={() => onView(row)}
                          data-testid={`view-btn-${idx}`}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          onClick={() => onEdit(row)}
                          data-testid={`edit-btn-${idx}`}
                          title="Edit Item"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(row)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          data-testid={`delete-btn-${idx}`}
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};