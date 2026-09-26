const mockEnv = { WEB_URL: 'https://orto.mn/' };
jest.mock('../../../config/env', () => ({ env: mockEnv }));
jest.mock('../../db/client', () => ({ prisma: {} }));

import { passwordResetLink } from '../passwordReset';

describe('passwordResetLink', () => {
  it('does not double the slash when WEB_URL ends with one', () => {
    expect(passwordResetLink('abc_DEF-1')).toBe('https://orto.mn/reset-password?token=abc_DEF-1');
  });

  it('works without a trailing slash', () => {
    mockEnv.WEB_URL = 'http://localhost:3000';
    expect(passwordResetLink('abc')).toBe('http://localhost:3000/reset-password?token=abc');
  });
});
