import 'dotenv/config'; // MUST be first — loads .env before any service module initializes
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Groq from 'groq-sdk';

import triageRouter from './routes/triage.js';
import calendarRouter from './routes/calendar.js';
import supportRouter from './routes/support.js';
import briefRouter from './routes/brief.js';
import ragRouter from './routes/rag.js';
import commandRouter from './routes/command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const OPEN_CORS = cors({ origin: '*' });

// In production the frontend is served by this same process — no CORS restriction needed
app.use(cors({ origin: IS_PROD ? '*' : 'http://localhost:5173' }));
app.use(express.json());

// ── OpenEnv evaluation endpoints (open CORS, registered first) ──

const RESET_OBSERVATION =
  'You are an AI Office Assistant. Your tasks include: ' +
  '1) Classify emails as important or spam ' +
  '2) Schedule meetings without conflicts ' +
  '3) Generate customer support replies ' +
  '4) Create meeting briefs ' +
  '5) Summarize email threads. ' +
  'What office task would you like to perform?';

app.post('/reset', OPEN_CORS, (_req, res) => {
  res.json({ observation: RESET_OBSERVATION, done: false });
});

app.post('/step', OPEN_CORS, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'You are an AI Office Assistant. Process the user\'s office task and return a helpful response. ' +
            'Tasks include email triage, calendar scheduling, customer support replies, meeting briefs, ' +
            'and email thread summarization.',
        },
        { role: 'user', content: message },
      ],
    });

    const response = (completion.choices[0].message.content || '').trim();

    res.json({
      observation: { echoed_message: response },
      reward: 1.0,
      done: true,
      info: {},
    });
  } catch (err) {
    console.error('[POST /step]', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/close', OPEN_CORS, (_req, res) => {
  res.json({ status: 'closed' });
});

// ── API routes ───────────────────────────────────────────────
app.use('/api/triage', triageRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/support', supportRouter);
app.use('/api/brief', briefRouter);
app.use('/api/rag', ragRouter);
app.use('/api/command', commandRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Static frontend (production only) ────────────────────────
if (IS_PROD) {
  app.use(express.static(join(__dirname, 'public')));
  // SPA fallback: all non-API routes serve index.html
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  });
} else {
  // Dev: return JSON 404 for unmatched routes
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  });
}

// ── Global error handler ─────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error', code: 'SERVER_ERROR' });
});

app.listen(PORT, () => {
  console.log(`AI Office Assistant backend running on http://localhost:${PORT}`);
});
