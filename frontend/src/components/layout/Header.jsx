import { Bell, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export const Header = ({ title, subtitle }) => {
  return (
    <header className="glass-header sticky top-0 z-30 h-16 flex items-center justify-between px-4 lg:px-6 hidden lg:flex">
      <div>
        <h1
          className="text-lg lg:text-xl font-bold text-slate-900"
          style={{ fontFamily: 'Manrope' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-slate-500">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            data-testid="header-search"
            placeholder="Search..."
            className="pl-10 w-32 lg:w-64 bg-white"
          />
        </div>

        <Button variant="ghost" size="icon" className="relative" data-testid="notifications-btn">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 lg:w-9 lg:h-9 bg-slate-200 rounded-full flex items-center justify-center">
            <span className="text-xs lg:text-sm font-medium text-slate-600">AD</span>
          </div>
        </div>
      </div>
    </header>
  );
};