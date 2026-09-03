import { useEffect } from 'react';
import { useAuth } from './auth';

// Maps tenant branding to the shadcn HSL CSS vars in index.css (:root).
// Branding fields: name, logo (URL), primary, accent — all HSL triplets.
// When a field is missing, the current InfoEIGHT default (from index.css)
// stays in place.
const APP_NAME = 'LogiTrack Pro';

const DEFAULTS = {
  '--primary': '222 47% 11%',
  '--primary-foreground': '210 40% 98%',
  '--ring': '222 47% 11%',
  '--chart-1': '222 47% 11%',
  '--accent': '24 95% 53%',
  '--accent-foreground': '0 0% 100%',
  '--chart-2': '24 95% 53%',
  '--brand-secondary': '0 0% 100%',
  '--brand-text': '222 84% 5%',
};

export function applyBranding(branding) {
  const b = branding || {};
  const root = document.documentElement;
  // Reset first so super tenant (no branding) always gets defaults,
  // even after a tenant session in the same browser.
  Object.entries(DEFAULTS).forEach(([k, v]) => root.style.setProperty(k, v));
  if (b.primary) {
    root.style.setProperty('--primary', b.primary);
    root.style.setProperty('--ring', b.primary);
    root.style.setProperty('--chart-1', b.primary);
  }
  if (b.accent) {
    root.style.setProperty('--accent', b.accent);
    root.style.setProperty('--chart-2', b.accent);
  }
  if (b.secondary) {
    root.style.setProperty('--brand-secondary', b.secondary);
  }
  if (b.text) {
    root.style.setProperty('--brand-text', b.text);
  }
  document.title = b.name ? `${b.name} | ${APP_NAME}` : APP_NAME;
}

export const ThemeProvider = ({ children }) => {
  const { tenant } = useAuth();

  useEffect(() => {
    applyBranding(tenant?.branding);
  }, [tenant]);

  return children;
};
