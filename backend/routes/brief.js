import { Router } from 'express';
import Groq from 'groq-sdk';

const router = Router();
const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.1-8b-instant';

const SYSTEM_PROMPT =
  "You are a meeting preparation assistant. Generate a concise 5-bullet meeting brief. " +
  "Include: 1) Meeting objective, 2) Key points to discuss, 3) Questions to ask, " +
  "4) Potential concerns to address, 5) Desired outcome. Be specific and actionable. " +
  'Respond in JSON: {"bullets":[{"icon":"objective"|"discuss"|"question"|"concern"|"outcome","title":"string","content":"string"}],"summary":"string"}';

// POST /api/brief/generate
router.post('/generate', async (req, res) => {
  try {
    const { personName, meetingTopic, recentContext } = req.body;

    if (!personName || !meetingTopic) {
      return res.status(400).json({ error: 'personName and meetingTopic are required' });
    }

    const userContent =
      `Person / company: ${personName}\n` +
      `Meeting topic: ${meetingTopic}` +
      (recentContext ? `\nRecent context: ${recentContext}` : '');

    const response = await client.chat.completions.create({
      model: MODEL,
      max_tokens: 800,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    const raw = response.choices[0].message.content;
    // Extract the first complete JSON object, discarding any trailing text
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model did not return valid JSON');
    const parsed = JSON.parse(match[0]);

    res.json(parsed);
  } catch (err) {
    console.error('[POST /api/brief/generate]', err);
    res.status(500).json({ error: err.message, code: 'BRIEF_ERROR' });
  }
});

export default router;
