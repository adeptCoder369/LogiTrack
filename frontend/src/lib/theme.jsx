import { useEffect } from 'react';
import { useAuth } from './auth';

// Maps tenant branding to the shadcn HSL CSS vars in index.css (:root).
// Branding fields: name, logo (URL), primary, accent — all HSL triplets.
// When a field is missing, the current InfoEIGHT default (from index.css)
// stays in place.
const APP_NAME = 'LogiTrack Pro';

export function applyBranding(branding) {
  const b = branding || {};
  const root = document.documentElement;
  if (b.primary) {
    root.style.setProperty('--primary', b.primary);
    root.style.setProperty('--primary-foreground', '210 40% 98%');
    root.style.setProperty('--ring', b.primary);
    root.style.setProperty('--chart-1', b.primary);
  }
  if (b.accent) {
    root.style.setProperty('--accent', b.accent);
    root.style.setProperty('--accent-foreground', '0 0% 100%');
    root.style.setProperty('--chart-2', b.accent);
  }
  if (b.name) {
    document.title = `${b.name} | ${APP_NAME}`;
  }
}

export const ThemeProvider = ({ children }) => {
  const { tenant } = useAuth();

  useEffect(() => {
    applyBranding(tenant?.branding);
  }, [tenant]);

  return children;
};
