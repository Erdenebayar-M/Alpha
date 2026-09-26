import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/server/backendClient";
import { asSignedInParent } from "@/lib/api/server/parentSession";
import { stripCorrectAnswer } from "@/lib/api/server/sanitizeTask";
import type { DiagnosticStartResponse } from "@/lib/api/types";

interface StartBody {
  name: string;
  grade: number; // 1..4 — the caller has already mapped "preschool" -> 1
}

/**
 * Creates a fresh learner under the signed-in parent's Parent account for
 * every run (a learner can only ever complete one diagnostic — POST
 * /diagnostic/start 409s forever after the first) and starts its diagnostic
 * session. See web/lib/api/server/parentSession.ts for how the proxy
 * authenticates to the backend.
 */
export function POST(request: Request) {
  return asSignedInParent("Unexpected error starting the diagnostic", async (token) => {
    const body = (await request.json().catch(() => null)) as StartBody | null;
    if (!body || typeof body.name !== "string" || !Number.isInteger(body.grade)) {
      return NextResponse.json({ error: "Expected { name: string, grade: number }" }, { status: 400 });
    }

    const learner = await backendFetch<{ id: string }>(token, "/learner", {
      method: "POST",
      body: { name: body.name, grade: body.grade },
    });

    const started = await backendFetch<{
      session_id: string;
      task: Record<string, unknown>;
      item_number: number;
    }>(token, "/diagnostic/start", {
      method: "POST",
      body: { learner_id: learner.id },
    });

    const response: DiagnosticStartResponse = {
      session_id: started.session_id,
      learner_id: learner.id,
      task: stripCorrectAnswer(started.task),
      item_number: started.item_number,
    };
    return NextResponse.json(response);
  });
}
