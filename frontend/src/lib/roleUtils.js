export const normalizeRoleName = (role) => {
  if (!role) return role;
  const normalized = String(role).trim();
  if (normalized === 'Weightment' || normalized === 'Dispatch Verifier' || normalized === 'Transporter') return normalized;
  return normalized;
};

export const getRoleDisplayName = (role) => normalizeRoleName(role);

export const normalizePermissionMap = (permissions = {}) => {
  if (!permissions || typeof permissions !== 'object') return permissions;

  return Object.fromEntries(
    Object.entries(permissions).map(([module, roleMap]) => {
      if (!roleMap || typeof roleMap !== 'object') {
        return [module, roleMap];
      }

      return [
        module,
        Object.fromEntries(
          Object.entries(roleMap).map(([role, value]) => [normalizeRoleName(role), value])
        ),
      ];
    })
  );
};
