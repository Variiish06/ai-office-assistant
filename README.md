---
title: AI Office Assistant
emoji: 🤖
colorFrom: indigo
colorTo: purple
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# AI Office Assistant

![Hackathon](https://img.shields.io/badge/Hackathon-OpenEnv-6366f1?style=flat-square)
![Meta](https://img.shields.io/badge/Powered%20by-Meta%20×%20Scaler-0866ff?style=flat-square)
![Claude](https://img.shields.io/badge/AI-Claude%20Sonnet-8b5cf6?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)

A full-stack AI-powered office productivity tool built for the **OpenEnv Hackathon (Meta × Scaler)**. It automates three high-value workplace tasks — email triage, meeting scheduling, and customer support — using the Anthropic API with Gmail and Google Calendar MCP server integrations.

---

## Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Email Triage** | Classify emails as `important` or `spam` with confidence score, priority (1-5), and one-sentence reasoning. Supports paste mode or live Gmail fetch. |
| 2 | **Calendar Scheduling** | Find conflict-free meeting slots within your existing Google Calendar and auto-book them. Shows today's and tomorrow's events in a live sidebar. |
| 3 | **Customer Support Reply** | Generate polished, empathetic replies under 150 words. Edit inline, adjust tone (formal/friendly), and send directly via Gmail. |

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Browser (port 5173)                    │
│  React + Vite                                              │
│  ┌──────────────┐ ┌─────────────────┐ ┌────────────────┐  │
│  │ EmailTriage  │ │CalendarScheduler│ │  SupportReply  │  │
│  └──────┬───────┘ └────────┬────────┘ └───────┬────────┘  │
│         └─────────────────┬┘──────────────────┘           │
│                           │  axios /api/*                  │
└───────────────────────────┼────────────────────────────────┘
                            │  HTTP proxy
┌───────────────────────────▼────────────────────────────────┐
│                   Express (port 3001)                       │
│  routes: /api/triage  /api/calendar  /api/support          │
│                                                             │
│  services/                                                  │
│  ┌──────────────────┐  ┌───────────────┐ ┌──────────────┐  │
│  │  claudeService   │  │  gmailService │ │calendarSvc   │  │
│  │  (Anthropic SDK) │  │  (Gmail MCP)  │ │(GCal MCP)    │  │
│  └────────┬─────────┘  └──────┬────────┘ └──────┬───────┘  │
└───────────┼────────────────────┼─────────────────┼──────────┘
            │                    │                 │
            ▼                    ▼                 ▼
    Anthropic API          Gmail MCP          GCal MCP
  (claude-sonnet-4)    (gmail.mcp.claude.com) (gcal.mcp.claude.com)
```

---

## Prerequisites

- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)
- Google OAuth credentials (Client ID + Client Secret + Refresh Token) for Gmail & Calendar MCP access

---

## Setup

### 1. Clone the repo

```bash
git clone <repo-url>
cd ai-office-assistant
```

### 2. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 3. Configure environment

Edit `backend/.env`:

```env
PORT=3001
ANTHROPIC_API_KEY=sk-ant-...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

GMAIL_MCP_URL=https://gmail.mcp.claude.com/mcp
GCAL_MCP_URL=https://gcal.mcp.claude.com/mcp
```

### 4. Run both servers

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## How It Works

### Email Triage
1. User pastes an email or clicks "Fetch from Gmail"
2. Backend calls `claudeService.classifyEmail()` with a strict JSON-response system prompt
3. Claude returns `{ label, reason, confidence, priority }`
4. In Gmail mode, spam emails are auto-labelled via Gmail MCP
5. Results are sorted: important first, then by priority

### Calendar Scheduling
1. User fills in title, duration, preferred day, and notes
2. Backend fetches the next 7 days of events from Google Calendar MCP
3. `claudeService.findAndBookSlot()` receives meeting requirements + existing events
4. Claude finds a conflict-free slot within 9 AM–6 PM working hours
5. If conflict-free, the event is created via Calendar MCP and a calendar link is returned

### Customer Support Reply
1. User pastes a customer message (+ optional company context)
2. Backend calls `claudeService.generateSupportReply()` with an empathy-focused system prompt
3. Reply is returned with word count and detected tone
4. User can edit inline, regenerate, or adjust tone (formal/friendly)
5. Reply can be sent directly via Gmail MCP

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Axios, Lucide React |
| Backend | Node.js, Express 4 |
| AI | Anthropic SDK (`@anthropic-ai/sdk`), `claude-sonnet-4-20250514` |
| MCP | `@modelcontextprotocol/sdk`, Gmail MCP, Google Calendar MCP |
| Styling | Pure CSS with custom design tokens, dark-mode support |

---

## API Reference

```
POST /api/triage              — classify email(s)
POST /api/triage/label        — apply Gmail label

POST /api/calendar/schedule   — find slot and book meeting
GET  /api/calendar/events     — list events for date range

POST /api/support/generate    — generate support reply
POST /api/support/send        — send reply via Gmail

GET  /api/health              — server health check
```

---

## Screenshots

_Add screenshots here after running the app._

---

## License

MIT © 2026 — Built for OpenEnv Hackathon (Meta × Scaler)
