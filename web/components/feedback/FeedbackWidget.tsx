import FeedbackPanel from "@/components/feedback/FeedbackPanel";
import { feedbackEnabled } from "@/lib/feedback/config";

/**
 * The dev site's feedback widget, on every page. A Server Component so the
 * enabled check (and the token behind it) stays on the server: where the
 * widget is off — Production included — the page carries no trace of it.
 */
export default function FeedbackWidget() {
  return feedbackEnabled() ? <FeedbackPanel /> : null;
}
