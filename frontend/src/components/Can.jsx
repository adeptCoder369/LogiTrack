import { usePermissions } from '../lib/permissions';

export const Can = ({ action, children, fallback = null }) => {
  const { hasActionPermission } = usePermissions();
  return hasActionPermission(action) ? children : fallback;
};