import { isSimplePattern, passwordWeakness, registerSchema, resemblesParent, resetPasswordSchema, utf8ByteLength } from '@app/shared';

// shared/ has no test runner of its own; its Weak password rules are tested here.

const parent = { email: 'bold.bat@example.com', name: 'Болд', surname: 'Батсүх' };

describe('passwordWeakness', () => {
  it.each([
    ['1234567', 'PASSWORD_TOO_SHORT'],
    ['a'.repeat(65), 'PASSWORD_TOO_LONG'],
    // 37 Cyrillic letters: under 64 characters but 74 bytes, past bcrypt's 72.
    ['ж'.repeat(36) + 'э', 'PASSWORD_TOO_LONG'],
    ['12345678', 'PASSWORD_PATTERN'],
    ['87654321', 'PASSWORD_PATTERN'],
    ['abcdefgh', 'PASSWORD_PATTERN'],
    ['HGFEDCBA', 'PASSWORD_PATTERN'],
    ['aaaaaaaa', 'PASSWORD_PATTERN'],
    ['жжжжжжжж', 'PASSWORD_PATTERN'],
    ['password', 'PASSWORD_COMMON'],
    ['Password123', 'PASSWORD_COMMON'],
    ['qwertyuiop', 'PASSWORD_COMMON'],
    ['12341234', 'PASSWORD_COMMON'],
  ])('rejects %j as %s', (password, weakness) => {
    expect(passwordWeakness(password)).toBe(weakness);
  });

  it.each(['correct horse battery', 'нууц-үг-минь-2026', 'ab'.repeat(32), 'жэ'.repeat(18), '  spaced out  '])('accepts %j', (password) => {
    expect(passwordWeakness(password)).toBeNull();
  });
});

describe('isSimplePattern', () => {
  it('does not treat a mixed or stepped string as a run', () => {
    expect(isSimplePattern('1234abcd')).toBe(false);
    expect(isSimplePattern('13579bdf')).toBe(false);
    expect(isSimplePattern('12345679')).toBe(false);
  });
});

describe('utf8ByteLength', () => {
  it('counts Latin as 1 byte and Cyrillic as 2', () => {
    expect(utf8ByteLength('abc')).toBe(3);
    expect(utf8ByteLength('өү')).toBe(4);
    expect(utf8ByteLength('😀')).toBe(4);
  });
});

describe('resemblesParent', () => {
  it('catches the email name, name or surname in any case', () => {
    expect(resemblesParent('xxBOLD.BATxx', parent)).toBe(true);
    expect(resemblesParent('болд2026!!', parent)).toBe(true);
    expect(resemblesParent('Батсүх-gerel', parent)).toBe(true);
  });

  it('ignores parts shorter than four characters', () => {
    expect(resemblesParent('bobcat-river', { email: 'bo@example.com', name: 'Бо' })).toBe(false);
  });
});

describe('registerSchema', () => {
  const body = { email: 'Bold.Bat@Example.com', name: 'Болд', surname: 'Батсүх', password: 'correct horse battery' };
  const passwordIssues = (input: unknown) => {
    const parsed = registerSchema.safeParse(input);
    return parsed.success ? [] : (parsed.error.flatten().fieldErrors as Record<string, string[]>).password ?? [];
  };

  it('accepts a strong password', () => {
    expect(registerSchema.safeParse(body).success).toBe(true);
  });

  it('reports the weakness as the password issue', () => {
    expect(passwordIssues({ ...body, password: '12345678' })).toEqual(['PASSWORD_PATTERN']);
    expect(passwordIssues({ ...body, password: 'password1' })).toEqual(['PASSWORD_COMMON']);
  });

  it('rejects a password resembling the parent, after the email is normalised', () => {
    expect(passwordIssues({ ...body, password: 'bold.bat-2026' })).toEqual(['PASSWORD_SIMILAR']);
  });
});

describe('resetPasswordSchema', () => {
  it('applies the weakness rules but not the resemblance check', () => {
    expect(resetPasswordSchema.safeParse({ token: 't', password: 'password1' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: 't', password: 'bold.bat-2026' }).success).toBe(true);
  });
});
