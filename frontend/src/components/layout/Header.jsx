import { useCallback } from 'react';
import { Bell, Search, MapPin, ScanLine } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { requestLocation, scanBarcode, isNativePlatform } from '../../lib/mobile';
import { toast } from 'sonner';

export const Header = ({ title, subtitle }) => {
  const handleRequestLocation = useCallback(async () => {
    try {
      const location = await requestLocation();
      toast.success(
        `Location captured: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      );
    } catch (error) {
      toast.error(error.message || 'Failed to get location');
    }
  }, []);

  const handleScanBarcode = useCallback(async () => {
    try {
      const result = await scanBarcode();
      navigator.clipboard.writeText(result.value).catch(() => { });
      toast.success(`Scanned: ${result.value} (copied to clipboard)`);
    } catch (error) {
      toast.error(error.message || 'Failed to scan barcode');
    }
  }, []);

  return (
    <header className="glass-header sticky top-0 z-30 h-16 flex items-center justify-between px-6">
      <div>
        <h1
          className="text-xl font-bold text-slate-900"
          style={{ fontFamily: 'Manrope' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            data-testid="header-search"
            placeholder="Search..."
            className="pl-10 w-64 bg-white"
          />
        </div>

        {/* <Button
          variant="ghost"
          size="icon"
          onClick={handleScanBarcode}
          title="Scan barcode"
          data-testid="scan-btn"
        >
          <ScanLine className="w-5 h-5 text-slate-600" />
        </Button> */}

        {/* <Button
          variant="ghost"
          size="icon"
          onClick={handleRequestLocation}
          title="Get current location"
          data-testid="location-btn"
        >
          <MapPin className="w-5 h-5 text-slate-600" />
        </Button> */}

        <Button variant="ghost" size="icon" className="relative" data-testid="notifications-btn">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-slate-600">AD</span>
          </div>
        </div>
      </div>
    </header>
  );
};