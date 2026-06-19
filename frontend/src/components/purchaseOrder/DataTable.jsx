import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Edit, Trash2, Eye } from 'lucide-react';

export const PurchaseOrdersDataTable = ({ 
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
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        {EmptyIcon && <EmptyIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />}
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  const hasActions = onEdit || onDelete || onView || customActions;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            {columns.map((col) => (
              <TableHead 
                key={col.key} 
                className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-3"
              >
                {col.label}
              </TableHead>
            ))}
            {hasActions && (
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider py-3 text-right">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => {
            const normalizedStatus = String(row?.status || '').trim().toLowerCase();
            const isCompletedRow = normalizedStatus === 'completed' && Number(row?.dispatched_quantity_mt || 0) >= Number(row?.total_quantity_mt || 0);
            return (
              <TableRow 
                key={row.id || idx} 
                className={`${isCompletedRow ? 'bg-emerald-50' : 'hover:bg-gray-50'} transition-colors border-b border-gray-100`}
                data-testid={`table-row-${idx}`}
              >
                {columns.map((col) => {
                // Determine the cell content
                let cellContent;

                if (col.render) {
                  cellContent = col.render(row[col.key], row);
                } else if (col.isProgress || col.key === 'dispatched' || col.key === 'progress') {
                  // Fallback progress bar logic if flagged in column definition
                  const percentage = Math.min(Math.max(Number(row[col.key]) || 0, 0), 100);
                  
                  // Dynamic coloring based on completeness
                  const barColor = percentage === 100 ? 'bg-green-600' : 'bg-blue-600';

                  cellContent = (
                    <div className="w-full max-w-[120px] min-w-[80px]">
                      <div className="flex items-center justify-between mb-1 text-xs font-medium text-gray-700">
                        <span>{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
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
                  <TableCell key={col.key} className="py-3 alignment-fix">
                    {cellContent}
                  </TableCell>
                );
              })}
              
              {hasActions && (
                <TableCell className="py-3 text-right">
                  <div className="flex justify-end gap-2">
                    {customActions && customActions(row)}
                    {onView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onView(row)}
                        data-testid={`view-btn-${idx}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(row)}
                        data-testid={`edit-btn-${idx}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(row)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`delete-btn-${idx}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};