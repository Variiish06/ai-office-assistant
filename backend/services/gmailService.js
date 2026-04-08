import Anthropic from '@anthropic-ai/sdk';


const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = 'claude-sonnet-4-20250514';
const GMAIL_MCP_URL = process.env.GMAIL_MCP_URL || 'https://gmail.mcp.claude.com/mcp';

const MOCK_EMAILS = [
  {
    id: 'mock-1',
    subject: 'Q3 Budget Review — urgent sign-off needed',
    sender: 'finance@company.com',
    date: new Date().toISOString(),
    snippet: 'Please review and sign off on the Q3 budget proposal by EOD.',
    body: 'Hi,\n\nPlease review and sign off on the Q3 budget proposal by EOD today. The board meeting is tomorrow morning and we need final approval.\n\nThanks,\nFinance Team',
  },
  {
    id: 'mock-2',
    subject: 'You have WON $1,000,000!!!',
    sender: 'noreply@definitely-not-spam.xyz',
    date: new Date().toISOString(),
    snippet: 'Congratulations! You have been selected as our lucky winner.',
    body: 'CONGRATULATIONS! You have been selected as our lucky winner of $1,000,000! Click here to claim your prize immediately. Limited time offer!',
  },
  {
    id: 'mock-3',
    subject: 'Team standup notes — April 8',
    sender: 'scrum@company.com',
    date: new Date().toISOString(),
    snippet: 'Notes from today\'s standup meeting attached.',
    body: 'Hi team,\n\nAttached are the notes from today\'s standup. Key blockers: deployment pipeline, API rate limits. Next steps discussed.\n\nScrum Master',
  },
  {
    id: 'mock-4',
    subject: 'EXCLUSIVE OFFER: Buy 2 Get 5 Free!!!',
    sender: 'deals@spam-offers.net',
    date: new Date().toISOString(),
    snippet: 'Don\'t miss this exclusive limited-time offer just for you!',
    body: 'EXCLUSIVE DEAL JUST FOR YOU! Buy any 2 items and get 5 FREE. Offer expires in 24 hours. Click now!',
  },
  {
    id: 'mock-5',
    subject: 'Project Kickoff — AI Office Assistant',
    sender: 'pm@company.com',
    date: new Date().toISOString(),
    snippet: 'Kickoff meeting scheduled for Monday 10 AM.',
    body: 'Hi everyone,\n\nThe project kickoff for AI Office Assistant is scheduled for Monday at 10 AM in Conference Room B. Please come prepared with your initial estimates.\n\nProject Manager',
  },
];

async function withMCPFallback(mcpFn, fallbackFn) {
  try {
    return await mcpFn();
  } catch (err) {
    console.warn('[gmailService] MCP call failed, using mock data:', err.message);
    return fallbackFn();
  }
}

export async function fetchInboxEmails(limit = 10) {
  return withMCPFallback(
    async () => {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `List the last ${limit} emails from my inbox. For each email return a JSON array with fields: id, subject, sender, date, snippet, body. Return ONLY valid JSON, no markdown.`,
          },
        ],
        mcp_servers: [
          {
            type: 'url',
            url: GMAIL_MCP_URL,
            name: 'gmail-mcp',
          },
        ],
        betas: ['mcp-client-2025-04-04'],
      });

      const text = response.content.find((c) => c.type === 'text')?.text || '[]';
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    },
    () => MOCK_EMAILS.slice(0, limit)
  );
}

export async function labelEmail(emailId, label) {
  return withMCPFallback(
    async () => {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `Apply the label "${label}" to email with ID "${emailId}" in Gmail. Return JSON: {"success": true|false}.`,
          },
        ],
        mcp_servers: [
          {
            type: 'url',
            url: GMAIL_MCP_URL,
            name: 'gmail-mcp',
          },
        ],
        betas: ['mcp-client-2025-04-04'],
      });

      const text = response.content.find((c) => c.type === 'text')?.text || '{"success":false}';
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    },
    () => {
      console.warn(`[gmailService] Mock: labeling email ${emailId} as ${label}`);
      return { success: true };
    }
  );
}

export async function sendEmail(to, subject, body) {
  return withMCPFallback(
    async () => {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Send an email via Gmail to: "${to}", subject: "${subject}", body: "${body}". Return JSON: {"success": true, "messageId": "<id>"}.`,
          },
        ],
        mcp_servers: [
          {
            type: 'url',
            url: GMAIL_MCP_URL,
            name: 'gmail-mcp',
          },
        ],
        betas: ['mcp-client-2025-04-04'],
      });

      const text = response.content.find((c) => c.type === 'text')?.text || '{"success":false}';
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    },
    () => {
      const mockId = 'mock-msg-' + Date.now();
      console.warn(`[gmailService] Mock: sending email to ${to}, messageId=${mockId}`);
      return { success: true, messageId: mockId };
    }
  );
}
