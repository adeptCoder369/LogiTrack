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

export const DataTable = ({ 
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
          {data.map((row, idx) => (
            <TableRow 
              key={row.id || idx} 
              className="hover:bg-gray-50 transition-colors border-b border-gray-100"
              data-testid={`table-row-${idx}`}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className="py-3">
                  {col.render ? col.render(row[col.key], row) : row[col.key] || '-'}
                </TableCell>
              ))}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
