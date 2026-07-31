import { describe, expect, it } from 'vitest';
import { getRoleHomePath, ROLE_HOME_PATHS } from '../utils/authRoutes';

describe('rol yönlendirmeleri', () => {
  it.each(Object.entries(ROLE_HOME_PATHS))('%s rolünü doğru panele gönderir', (role, path) => {
    expect(getRoleHomePath(role)).toBe(path);
  });
  it('bilinmeyen rolü güvenli ana sayfaya gönderir', () => expect(getRoleHomePath('bilinmeyen')).toBe('/'));
});
