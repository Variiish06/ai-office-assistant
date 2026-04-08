import { Router } from 'express';
import { generateSupportReply } from '../services/claudeService.js';
import { sendEmail } from '../services/gmailService.js';

const router = Router();

function inferTone(text) {
  const lower = text.toLowerCase();
  if (lower.includes('apologize') || lower.includes('sorry') || lower.includes('understand')) {
    return 'empathetic';
  }
  if (lower.includes('please') || lower.includes('happy to') || lower.includes('glad')) {
    return 'friendly';
  }
  return 'professional';
}

// POST /api/support/generate
router.post('/generate', async (req, res) => {
  try {
    const { customerMessage, companyContext } = req.body;
    if (!customerMessage || typeof customerMessage !== 'string') {
      return res.status(400).json({ error: 'customerMessage is required' });
    }

    const reply = await generateSupportReply(customerMessage, companyContext);
    const wordCount = reply.trim().split(/\s+/).length;
    const tone = inferTone(reply);

    res.json({ reply, wordCount, tone });
  } catch (err) {
    console.error('[POST /api/support/generate]', err);
    res.status(500).json({ error: err.message, code: 'SUPPORT_ERROR' });
  }
});

// POST /api/support/send
router.post('/send', async (req, res) => {
  try {
    const { to, subject, reply } = req.body;
    if (!to || !subject || !reply) {
      return res.status(400).json({ error: 'to, subject, and reply are required' });
    }

    const result = await sendEmail(to, subject, reply);
    res.json({ success: result.success, messageId: result.messageId });
  } catch (err) {
    console.error('[POST /api/support/send]', err);
    res.status(500).json({ error: err.message, code: 'SEND_ERROR' });
  }
});

export default router;
