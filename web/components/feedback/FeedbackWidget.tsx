import FeedbackPanel from "@/components/feedback/FeedbackPanel";
import { feedbackEnabled } from "@/lib/feedback/config";
import { r2Config } from "@/lib/feedback/r2";

/**
 * The dev site's feedback widget, on every page. A Server Component so the
 * enabled check (and the token behind it) stays on the server: where the
 * widget is off — Production included — the page carries no trace of it.
 * The image field shows only where R2 is configured.
 */
export default function FeedbackWidget() {
  return feedbackEnabled() ? <FeedbackPanel imagesEnabled={r2Config() !== null} /> : null;
}
