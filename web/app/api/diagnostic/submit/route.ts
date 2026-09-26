import { NextResponse } from "next/server";
import { backendFetch } from "@/lib/api/server/backendClient";
import { asSignedInParent } from "@/lib/api/server/parentSession";
import { stripCorrectAnswer } from "@/lib/api/server/sanitizeTask";
import type { DiagnosticSubmitResponse } from "@/lib/api/types";

interface SubmitBody {
  session_id: string;
  task_id: string;
  input_text: string;
  time_seconds: number;
}

export function POST(request: Request) {
  return asSignedInParent("Unexpected error submitting the answer", async (token) => {
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

    const result = await backendFetch<Record<string, unknown>>(token, "/diagnostic/submit", {
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
  });
}
