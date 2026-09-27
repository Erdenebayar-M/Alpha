/** A "we sent a link to <email>" sentence, the address in bold: the
 *  confirmation after Password reset is requested and after Sign up. */
export default function SentToEmail({ copy, email }: { copy: { beforeEmail: string; afterEmail: string }; email: string }) {
  return (
    <>
      {copy.beforeEmail}
      <strong className="font-bold text-auth-ink">{email}</strong>
      {copy.afterEmail}
    </>
  );
}
