import "server-only";
import { cookies } from "next/headers";
import { ApiError, UnauthorizedError, type ApiResponse } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:3001";

export async function serverFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      cookie: cookieHeader,
      ...init.headers,
    },
    cache: "no-store",
  });

  const body = (await res.json()) as ApiResponse<T>;

  if (!body.success) {
    if (res.status === 401) {
      throw new UnauthorizedError(body.error.message);
    }
    throw new ApiError(
      body.error.code,
      body.error.message,
      body.error.details,
      res.status
    );
  }

  return body.data;
}
