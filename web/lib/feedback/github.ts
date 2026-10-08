import type { FeedbackIssue } from "@/lib/feedback/issue";
import { siteConfig } from "@/lib/site-config";

export type CreatedIssue = { issueNumber: number; issueUrl: string };

/** Creates the issue on this repo as the token's owner; `null` on any failure. Server-side only. */
export async function createGitHubIssue(issue: FeedbackIssue, token: string): Promise<CreatedIssue | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${siteConfig.feedbackRepo}/issues`, {
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify(issue),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const { number, html_url } = (await res.json()) as { number?: unknown; html_url?: unknown };
    return typeof number === "number" && typeof html_url === "string" ? { issueNumber: number, issueUrl: html_url } : null;
  } catch {
    return null;
  }
}
