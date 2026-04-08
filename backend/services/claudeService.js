import Groq from 'groq-sdk';

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY environment variable is not set');
}

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = 'llama-3.1-8b-instant';

function safeParseJSON(rawText) {
  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Model did not return valid JSON');
  return JSON.parse(match[0]);
}

export async function classifyEmail(emailText) {
  const systemPrompt =
    'You are an email classifier. Respond ONLY with valid JSON: ' +
    '{"label":"important"|"spam","reason":"one sentence explanation",' +
    '"confidence":"high"|"medium"|"low","priority":1-5}';

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: emailText },
    ],
  });

  return safeParseJSON(response.choices[0].message.content);
}

export async function findAndBookSlot(meetingDetails, existingEvents) {
  const systemPrompt =
    'You are a scheduling assistant. You will receive meeting details and a list of existing ' +
    'calendar events. Find the best available time slot that does not conflict with any existing ' +
    'event. Work hours are 9am-6pm. Respond ONLY with valid JSON: ' +
    '{"suggested_date":"YYYY-MM-DD","start_time":"HH:MM","end_time":"HH:MM",' +
    '"display_time":"e.g. Tomorrow, 2:00 PM – 3:00 PM","rationale":"one sentence",' +
    '"conflict_free":true|false}';

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify({ meetingDetails, existingEvents }) },
    ],
  });

  return safeParseJSON(response.choices[0].message.content);
}

export async function generateSupportReply(customerMessage, companyContext) {
  const systemPrompt =
    'You are a professional, empathetic customer support agent for a tech company. ' +
    'Write a helpful reply under 150 words. Acknowledge the issue clearly, provide a concrete ' +
    'next step or resolution timeline, and close warmly. Use a friendly but professional tone. ' +
    'Return only the email body text, no subject line.';

  const userContent =
    'Customer message:\n\n' +
    customerMessage +
    (companyContext ? '\n\nContext: ' + companyContext : '');

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 600,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });

  return response.choices[0].message.content;
}
