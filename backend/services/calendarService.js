import Anthropic from '@anthropic-ai/sdk';


const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';
const GCAL_MCP_URL = process.env.GCAL_MCP_URL || 'https://gcal.mcp.claude.com/mcp';

function getMockEvents() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tmm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const tdd = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowStr = `${tomorrow.getFullYear()}-${tmm}-${tdd}`;

  return [
    {
      id: 'evt-1',
      title: 'Daily Standup',
      startTime: '09:00',
      endTime: '09:30',
      date: todayStr,
    },
    {
      id: 'evt-2',
      title: 'Product Review',
      startTime: '14:00',
      endTime: '15:00',
      date: todayStr,
    },
    {
      id: 'evt-3',
      title: 'Design Sync',
      startTime: '11:00',
      endTime: '11:30',
      date: tomorrowStr,
    },
    {
      id: 'evt-4',
      title: 'Sprint Planning',
      startTime: '15:00',
      endTime: '17:00',
      date: tomorrowStr,
    },
  ];
}

async function withMCPFallback(mcpFn, fallbackFn) {
  try {
    return await mcpFn();
  } catch (err) {
    console.warn('[calendarService] MCP call failed, using mock data:', err.message);
    return fallbackFn();
  }
}

export async function getEventsForRange(startDate, endDate) {
  return withMCPFallback(
    async () => {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `List all Google Calendar events between ${startDate} and ${endDate}. Return a JSON array with fields: id, title, startTime (HH:MM), endTime (HH:MM), date (YYYY-MM-DD). Return ONLY valid JSON, no markdown.`,
          },
        ],
        mcp_servers: [
          {
            type: 'url',
            url: GCAL_MCP_URL,
            name: 'gcal-mcp',
          },
        ],
        betas: ['mcp-client-2025-04-04'],
      });

      const text = response.content.find((c) => c.type === 'text')?.text || '[]';
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    },
    () => {
      const mock = getMockEvents();
      return mock.filter((e) => e.date >= startDate && e.date <= endDate);
    }
  );
}

export async function createEvent(title, date, startTime, endTime, description = '') {
  return withMCPFallback(
    async () => {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Create a Google Calendar event: title="${title}", date=${date}, start=${startTime}, end=${endTime}, description="${description}". Return JSON: {"id":"<event_id>","link":"<calendar_link>"}.`,
          },
        ],
        mcp_servers: [
          {
            type: 'url',
            url: GCAL_MCP_URL,
            name: 'gcal-mcp',
          },
        ],
        betas: ['mcp-client-2025-04-04'],
      });

      const text = response.content.find((c) => c.type === 'text')?.text || '{}';
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    },
    () => {
      const mockId = 'mock-evt-' + Date.now();
      const mockLink = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(title)}&dates=${date}T${startTime.replace(':', '')}/${date}T${endTime.replace(':', '')}`;
      console.warn(`[calendarService] Mock: created event "${title}" on ${date}, id=${mockId}`);
      return { id: mockId, link: mockLink };
    }
  );
}
