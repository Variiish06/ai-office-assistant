import { Router } from 'express';
import Groq from 'groq-sdk';
import { classifyEmail } from '../services/claudeService.js';
import { fetchInboxEmails, labelEmail } from '../services/gmailService.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const router = Router();

// POST /api/triage
router.post('/', async (req, res) => {
  try {
    const { emailText, useGmail, limit = 10 } = req.body;

    let emails = [];

    if (useGmail) {
      const fetched = await fetchInboxEmails(limit);
      emails = fetched;
    } else {
      if (!emailText || typeof emailText !== 'string') {
        return res.status(400).json({ error: 'emailText is required when useGmail is not set' });
      }
      emails = [{ id: null, subject: '(pasted)', sender: 'unknown', date: null, body: emailText }];
    }

    const results = await Promise.all(
      emails.map(async (email) => {
        const textToClassify = email.body || email.snippet || email.subject || '';
        const classification = await classifyEmail(
          `Subject: ${email.subject}\nFrom: ${email.sender}\n\n${textToClassify}`
        );

        // Auto-label spam in Gmail mode
        if (useGmail && email.id && classification.label === 'spam') {
          await labelEmail(email.id, 'spam').catch((e) =>
            console.warn('[triage] labelEmail failed:', e.message)
          );
        }

        return {
          id: email.id,
          subject: email.subject,
          sender: email.sender,
          date: email.date,
          label: classification.label,
          reason: classification.reason,
          confidence: classification.confidence,
          priority: classification.priority,
        };
      })
    );

    res.json({ results });
  } catch (err) {
    console.error('[POST /api/triage]', err);
    res.status(500).json({ error: err.message, code: 'TRIAGE_ERROR' });
  }
});

// POST /api/triage/label
router.post('/label', async (req, res) => {
  try {
    const { emailId, label } = req.body;
    if (!emailId || !label) {
      return res.status(400).json({ error: 'emailId and label are required' });
    }
    const result = await labelEmail(emailId, label);
    res.json({ success: result.success });
  } catch (err) {
    console.error('[POST /api/triage/label]', err);
    res.status(500).json({ error: err.message, code: 'LABEL_ERROR' });
  }
});

// POST /api/triage/summarize
router.post('/summarize', async (req, res) => {
  try {
    const { thread } = req.body;
    if (!thread || typeof thread !== 'string') {
      return res.status(400).json({ error: 'thread is required' });
    }

    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content:
            'You are an email thread analyst. Analyze this email thread and respond ONLY in JSON: ' +
            '{"decided":[string],"pending":[string],"owners":[{"person":string,"task":string}],' +
            '"nextStep":string,"sentiment":"positive"|"neutral"|"tense"}',
        },
        { role: 'user', content: thread },
      ],
    });

    const raw = response.choices[0].message.content;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Model did not return valid JSON');
    res.json(JSON.parse(match[0]));
  } catch (err) {
    console.error('[POST /api/triage/summarize]', err);
    res.status(500).json({ error: err.message, code: 'SUMMARIZE_ERROR' });
  }
});

export default router;
