export const ROLE_HOME_PATHS = Object.freeze({
  admin: '/admin',
  cavus: '/cavus',
  sofor: '/sofor',
  sirket: '/sirket',
});

export function getRoleHomePath(role) {
  return ROLE_HOME_PATHS[role] || '/';
}
