/* eslint-env jest */
import { clearStoredSession } from './authContext';

jest.mock('./api', () => ({ get: jest.fn() }));

test('clearStoredSession removes all identity and tenant cache values', () => {
  const invalidated = jest.fn();
  window.addEventListener('signaltrue:session-invalidated', invalidated);
  localStorage.setItem('token', 'expired-token');
  localStorage.setItem('user', '{"role":"admin"}');
  localStorage.setItem('orgId', 'org-1');
  localStorage.setItem('teamId', 'team-1');
  localStorage.setItem('unrelated-preference', 'keep');

  clearStoredSession();

  expect(localStorage.getItem('token')).toBeNull();
  expect(localStorage.getItem('user')).toBeNull();
  expect(localStorage.getItem('orgId')).toBeNull();
  expect(localStorage.getItem('teamId')).toBeNull();
  expect(localStorage.getItem('unrelated-preference')).toBe('keep');
  expect(invalidated).toHaveBeenCalledTimes(1);
  window.removeEventListener('signaltrue:session-invalidated', invalidated);
});
