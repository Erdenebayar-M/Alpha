/** `bat@gmail.com` → `b***@gmail.com`: the first character and the domain, with
 *  a fixed-length mask so the local part's length isn't given away. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  // Array.from takes a whole character, not half a surrogate pair.
  const first = Array.from(email)[0] ?? '';
  return at < 0 ? `${first}***` : `${first}***${email.slice(at)}`;
}
