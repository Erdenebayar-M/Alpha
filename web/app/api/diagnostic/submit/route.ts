import { NextResponse } from "next/server";
import { backendFetch, BackendRequestError } from "@/lib/api/server/backendClient";
import { stripCorrectAnswer } from "@/lib/api/server/sanitizeTask";
import type { DiagnosticSubmitResponse } from "@/lib/api/types";

interface SubmitBody {
  session_id: string;
  task_id: string;
  input_text: string;
  time_seconds: number;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SubmitBody | null;
  if (
    !body ||
    typeof body.session_id !== "string" ||
    typeof body.task_id !== "string" ||
    typeof body.input_text !== "string" ||
    !Number.isFinite(body.time_seconds)
  ) {
    return NextResponse.json(
      { error: "Expected { session_id, task_id, input_text, time_seconds }" },
      { status: 400 },
    );
  }

  try {
    const result = await backendFetch<Record<string, unknown>>("/diagnostic/submit", {
      method: "POST",
      body,
    });

    const response: DiagnosticSubmitResponse = result.completed
      ? (result as unknown as DiagnosticSubmitResponse)
      : ({
          ...result,
          next_task: stripCorrectAnswer(result.next_task as Record<string, unknown>),
        } as unknown as DiagnosticSubmitResponse);

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof BackendRequestError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Unexpected error submitting the answer" }, { status: 502 });
  }
}
