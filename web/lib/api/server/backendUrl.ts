/**
 * Where the backend listens. Only ever imported from server-side code (route
 * handlers under web/app/api/* and server components), which never reaches a
 * client bundle — so no `server-only` dependency (AGENTS.md: don't add one
 * unless native APIs can't do the job).
 */
export const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3001";
