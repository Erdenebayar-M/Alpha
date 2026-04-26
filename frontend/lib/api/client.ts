import { ApiError, UnauthorizedError, type ApiResponse } from "./types";

export async function clientFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    credentials: "include",
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
