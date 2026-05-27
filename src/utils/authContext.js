import api from './api';

export function normalizeId(value) {
  if (!value) return null;
  if (typeof value === 'object') return String(value._id || value.id || '');
  return String(value);
}

export async function getAuthenticatedContext() {
  const { data: user } = await api.get('/auth/me');
  const orgId = normalizeId(user.orgId);
  const teamId = normalizeId(user.teamId);

  if (orgId) localStorage.setItem('orgId', orgId);
  if (teamId) localStorage.setItem('teamId', teamId);

  return { user, orgId, teamId };
}
