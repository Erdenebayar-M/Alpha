"use client";

import type { DiagnosticStartResponse, DiagnosticSubmitResponse } from "@/lib/api/types";
import { ApiClientError } from "@/lib/api/types";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiClientError(json?.code ?? "REQUEST_FAILED", json?.error ?? res.statusText);
  }
  return json as T;
}

export function startDiagnostic(name: string, grade: number): Promise<DiagnosticStartResponse> {
  return postJson("/api/diagnostic/start", { name, grade });
}

export function submitDiagnostic(
  sessionId: string,
  taskId: string,
  inputText: string,
  timeSeconds: number,
): Promise<DiagnosticSubmitResponse> {
  return postJson("/api/diagnostic/submit", {
    session_id: sessionId,
    task_id: taskId,
    input_text: inputText,
    time_seconds: timeSeconds,
  });
}
