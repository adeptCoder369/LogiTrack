import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';

export const FormModal = ({ 
  open, 
  onClose, 
  title, 
  children, 
  onSubmit,
  submitLabel = 'Save',
  loading = false
}) => {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" style={{ pointerEvents: 'auto' }}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div className="space-y-4 py-4">
            {children}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t relative z-50">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              data-testid="modal-cancel-btn"
              className="relative z-50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-slate-900 hover:bg-slate-800 relative z-50"
              data-testid="modal-submit-btn"
            >
              {loading ? 'Saving...' : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
