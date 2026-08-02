export function hasPermission(user, code) {
  if (user?.role === 'admin') return true;
  return Array.isArray(user?.permissions) && (user.permissions.includes('*') || user.permissions.includes(code));
}
