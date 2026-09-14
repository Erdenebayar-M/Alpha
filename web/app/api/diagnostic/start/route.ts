import { NextResponse } from "next/server";
import { backendFetch, BackendRequestError } from "@/lib/api/server/backendClient";
import { stripCorrectAnswer } from "@/lib/api/server/sanitizeTask";
import type { DiagnosticStartResponse } from "@/lib/api/types";

interface StartBody {
  name: string;
  grade: number; // 1..4 — the caller has already mapped "preschool" -> 1
}

/**
 * Creates a fresh learner for every run (a learner can only ever complete one
 * diagnostic — POST /diagnostic/start 409s forever after the first) and
 * starts its diagnostic session. See web/lib/api/server/backendAuth.ts for
 * how the proxy authenticates to the backend.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as StartBody | null;
  if (!body || typeof body.name !== "string" || !Number.isInteger(body.grade)) {
    return NextResponse.json({ error: "Expected { name: string, grade: number }" }, { status: 400 });
  }

  try {
    const learner = await backendFetch<{ id: string }>("/learner", {
      method: "POST",
      body: { name: body.name, grade: body.grade },
    });

    const started = await backendFetch<{
      session_id: string;
      task: Record<string, unknown>;
      item_number: number;
    }>("/diagnostic/start", {
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
  } catch (err) {
    if (err instanceof BackendRequestError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error starting the diagnostic" }, { status: 502 });
  }
}
