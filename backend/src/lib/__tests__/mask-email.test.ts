import { maskEmail } from '../mask-email';

describe('maskEmail', () => {
  it('keeps the first character and the domain', () => {
    expect(maskEmail('bat@gmail.com')).toBe('b***@gmail.com');
  });

  it('gives a one-character local part the same mask, so length is not leaked', () => {
    expect(maskEmail('b@gmail.com')).toBe('b***@gmail.com');
    expect(maskEmail('batbayar.long@gmail.com')).toBe('b***@gmail.com');
  });

  it('takes a whole character, not half a surrogate pair', () => {
    expect(maskEmail('😀x@gmail.com')).toBe('😀***@gmail.com');
  });

  it('shows no tail of an address without an @', () => {
    expect(maskEmail('batgmail.com')).toBe('b***');
  });
});
