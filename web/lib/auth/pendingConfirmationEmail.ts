// The address sign-up just sent a confirmation link to, kept for this tab so
// the "link expired or used" page can offer a resend without asking again.
// Storage can be blocked, so both ends tolerate it failing.
const KEY = "orto:pending-confirmation-email";

export function rememberPendingConfirmationEmail(email: string): void {
  try {
    sessionStorage.setItem(KEY, email);
  } catch {}
}

export function recallPendingConfirmationEmail(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
