import { Hono } from 'hono';

// POST /api/diagnostic/start
// POST /api/diagnostic/submit
// POST /api/diagnostic/next-phase
// GET  /api/diagnostic/result/:sessionId
// TODO: implement handlers

const diagnostic = new Hono();

export default diagnostic;
