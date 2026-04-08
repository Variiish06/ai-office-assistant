import { Router } from 'express';
import Groq from 'groq-sdk';
import { classifyEmail, generateSupportReply, findAndBookSlot } from '../services/claudeService.js';
import { getEventsForRange, createEvent } from '../services/calendarService.js';
import { generateRAGReply } from '../services/ragService.js';


const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.1-8b-instant';

const CLASSIFY_PROMPT = `You are an AI office assistant router. Analyze the user's natural language command and respond ONLY in JSON:
{
  "feature": "triage" | "calendar" | "support" | "brief" | "rag" | "summarize",
  "action": "string",
  "params": {
    "emailText": "string",
    "meetingTitle": "string",
    "duration": number,
    "preferredDay": "string",
    "customerMessage": "string",
    "personName": "string",
    "meetingTopic": "string",
    "thread": "string"
  },
  "response": "string (friendly confirmation of what you understood)",
  "canExecute": boolean
}
Examples:
"schedule a meeting with Priya tomorrow for 30 mins" → {"feature":"calendar","params":{"meetingTitle":"Meeting with Priya","duration":30,"preferredDay":"Tomorrow"},"response":"Scheduling a 30-minute meeting with Priya for tomorrow.","canExecute":true}
"is this email spam: You won a prize click here" → {"feature":"triage","params":{"emailText":"You won a prize click here"},"response":"Classifying that email for you.","canExecute":true}
"write a reply to angry customer who didnt get order" → {"feature":"support","params":{"customerMessage":"Customer did not receive their order and is angry about the delay"},"response":"Drafting an empathetic support reply.","canExecute":true}
"brief me for investor meeting with Sequoia" → {"feature":"brief","params":{"personName":"Sequoia Capital","meetingTopic":"Investor meeting"},"response":"Generating your meeting brief for Sequoia Capital.","canExecute":true}
"summarize this thread" → {"feature":"summarize","params":{"thread":""},"response":"I need the email thread text to summarize. Please paste it after your command.","canExecute":false}`;

const BRIEF_PROMPT =
  'You are a meeting preparation assistant. Generate a concise 5-bullet meeting brief. ' +
  'Include: 1) Meeting objective, 2) Key points to discuss, 3) Questions to ask, ' +
  '4) Potential concerns to address, 5) Desired outcome. Be specific and actionable. ' +
  'Respond in JSON: {"bullets":[{"icon":"objective"|"discuss"|"question"|"concern"|"outcome","title":"string","content":"string"}],"summary":"string"}';

const SUMMARIZE_PROMPT =
  'You are an email thread analyst. Analyze this email thread and respond ONLY in JSON: ' +
  '{"decided":[string],"pending":[string],"owners":[{"person":string,"task":string}],' +
  '"nextStep":string,"sentiment":"positive"|"neutral"|"tense"}';

async function executeCommand(feature, params) {
  switch (feature) {
    case 'triage': {
      return await classifyEmail(params.emailText || '(no content provided)');
    }

    case 'calendar': {
      const today = new Date().toISOString().split('T')[0];
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      const existingEvents = await getEventsForRange(today, nextWeek);
      const meetingDetails = {
        title: params.meetingTitle || 'Meeting',
        duration: params.duration || 60,
        preferredDay: params.preferredDay || 'tomorrow',
        notes: '',
        today,
      };
      const slot = await findAndBookSlot(meetingDetails, existingEvents);
      let eventId = null, calendarLink = null;
      if (slot.conflict_free) {
        const created = await createEvent(
          meetingDetails.title, slot.suggested_date,
          slot.start_time, slot.end_time, ''
        );
        eventId = created.id;
        calendarLink = created.link;
      }
      return {
        suggestedTime: `${slot.start_time} – ${slot.end_time}`,
        displayTime: slot.display_time,
        rationale: slot.rationale,
        conflictFree: slot.conflict_free,
        eventId,
        calendarLink,
      };
    }

    case 'support': {
      const reply = await generateSupportReply(params.customerMessage || '');
      return { reply, wordCount: reply.trim().split(/\s+/).length };
    }

    case 'brief': {
      const response = await groq.chat.completions.create({
        model: MODEL,
        max_tokens: 800,
        messages: [
          { role: 'system', content: BRIEF_PROMPT },
          {
            role: 'user',
            content: `Person / company: ${params.personName || 'Unknown'}\nMeeting topic: ${params.meetingTopic || 'General meeting'}`,
          },
        ],
      });
      const raw = response.choices[0].message.content;
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Brief generation failed');
      return JSON.parse(match[0]);
    }

    case 'rag': {
      return await generateRAGReply(params.customerMessage || '');
    }

    case 'summarize': {
      const response = await groq.chat.completions.create({
        model: MODEL,
        max_tokens: 700,
        messages: [
          { role: 'system', content: SUMMARIZE_PROMPT },
          { role: 'user', content: params.thread || '' },
        ],
      });
      const raw = response.choices[0].message.content;
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Summarize failed');
      return JSON.parse(match[0]);
    }

    default:
      return null;
  }
}

// POST /api/command
router.post('/', async (req, res) => {
  try {
    const { command } = req.body;
    if (!command || typeof command !== 'string') {
      return res.status(400).json({ error: 'command is required' });
    }

    // Step 1 — classify
    const classifyRes = await groq.chat.completions.create({
      model: MODEL,
      max_tokens: 400,
      messages: [
        { role: 'system', content: CLASSIFY_PROMPT },
        { role: 'user', content: command },
      ],
    });

    const raw = classifyRes.choices[0].message.content;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Command classification failed');
    const classified = JSON.parse(match[0]);

    const { feature, params, response: understood, canExecute } = classified;

    // Step 2 — execute if possible
    let result = null;
    if (canExecute) {
      result = await executeCommand(feature, params || {});
    }

    res.json({ understood, feature, result, canExecute });
  } catch (err) {
    console.error('[POST /api/command]', err);
    res.status(500).json({ error: err.message, code: 'COMMAND_ERROR' });
  }
});

export default router;
