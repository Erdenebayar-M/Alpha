const mockEnv: { RESEND_API_KEY?: string; EMAIL_FROM?: string; WEB_URL: string } = {
  WEB_URL: 'http://localhost:3000',
};
jest.mock('../../config/env', () => ({ env: mockEnv }));

import { sendEmail, passwordResetEmail } from '../email';

const MESSAGE = { to: 'parent@example.com', subject: 'Subject', text: 'Plain body', html: '<p>Html body</p>' };

describe('sendEmail', () => {
  const fetchMock = jest.fn();
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    delete mockEnv.RESEND_API_KEY;
    delete mockEnv.EMAIL_FROM;
  });

  afterEach(() => logSpy.mockRestore());

  it('logs the message to the console and calls nothing when RESEND_API_KEY is unset', async () => {
    await sendEmail(MESSAGE);

    expect(fetchMock).not.toHaveBeenCalled();
    const logged = logSpy.mock.calls.flat().join('\n');
    expect(logged).toContain('parent@example.com');
    expect(logged).toContain('Subject');
    expect(logged).toContain('Plain body');
  });

  it("sends through Resend's HTTP API when RESEND_API_KEY is set", async () => {
    mockEnv.RESEND_API_KEY = 're_test_key';
    mockEnv.EMAIL_FROM = 'no-reply@orto.mn';
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 'email-id' }), { status: 200 }));

    await sendEmail(MESSAGE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer re_test_key');
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'no-reply@orto.mn',
      to: ['parent@example.com'],
      subject: 'Subject',
      text: 'Plain body',
      html: '<p>Html body</p>',
    });
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('throws when Resend rejects the message', async () => {
    mockEnv.RESEND_API_KEY = 're_test_key';
    mockEnv.EMAIL_FROM = 'no-reply@orto.mn';
    fetchMock.mockResolvedValue(new Response('{"message":"bad"}', { status: 422 }));

    await expect(sendEmail(MESSAGE)).rejects.toThrow('422');
  });
});

describe('passwordResetEmail', () => {
  const link = 'http://localhost:3000/reset-password?token=abc_DEF-123';
  const email = passwordResetEmail({ to: 'parent@example.com', name: 'Болд', link });

  it('uses the approved subject', () => {
    expect(email.subject).toBe('ОРТО — нууц үг сэргээх');
    expect(email.to).toBe('parent@example.com');
  });

  it('greets the parent by name and carries the approved body in both parts', () => {
    for (const part of [email.text, email.html]) {
      expect(part).toContain('Сайн байна уу, Болд,');
      expect(part).toContain('Нууц үгээ шинэчлэхийн тулд доорх товчийг дарна уу.');
      expect(part).toContain('Энэ холбоос 30 минут л хүчинтэй байх болно.');
      expect(part).toContain('Хэрэв та энэ хүсэлтийг илгээгээгүй бол уг имэйлийг хэрэгсэхгүй орхино уу.');
    }
  });

  it('links the "Нууц үг сэргээх" button to the reset page', () => {
    expect(email.html).toMatch(new RegExp(`<a [^>]*href="${link.replace(/[?]/g, '\\?')}"[^>]*>Нууц үг сэргээх</a>`));
    expect(email.text).toContain(link);
  });

  it('escapes the name in the html part', () => {
    const hostile = passwordResetEmail({ to: 'a@b.com', name: '<script>x</script>', link });
    expect(hostile.html).not.toContain('<script>');
    expect(hostile.html).toContain('&lt;script&gt;');
  });
});
