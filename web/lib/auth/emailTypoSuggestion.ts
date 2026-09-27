/**
 * "Did you mean bat@gmail.com?" on Sign up — catches a mistyped domain
 * before the account exists. A fixed list of common domains and their
 * misspellings (issue #139); not a general spell-checker, so an unusual but
 * correct domain (or one not on this list) suggests nothing.
 */

const DOMAIN_CORRECTIONS: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gnail.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "outlook.co": "outlook.com",
  "outlook.con": "outlook.com",
  "icloud.co": "icloud.com",
  "icloud.con": "icloud.com",
  "iclod.com": "icloud.com",
};

/** The corrected full address for a mistyped domain, or `null` when the
 *  domain is correct, unknown, or there is no domain yet to check. */
export function suggestEmailCorrection(rawEmail: string): string | null {
  const email = rawEmail.trim();
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;

  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  const corrected = DOMAIN_CORRECTIONS[domain];
  return corrected ? `${local}@${corrected}` : null;
}
