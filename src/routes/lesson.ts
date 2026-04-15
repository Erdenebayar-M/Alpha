import { Hono } from 'hono';

// GET  /api/lesson/today
// POST /api/lesson/attempt
// POST /api/lesson/:id/complete
// TODO: implement handlers

const lesson = new Hono();

export default lesson;
