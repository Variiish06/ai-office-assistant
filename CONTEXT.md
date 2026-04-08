# AI Office Assistant — Full Project Context

## What This Is
A full-stack AI-powered office assistant built for the OpenEnv Hackathon (Meta × Scaler).
Stack: React + Vite (frontend), Node.js + Express (backend), Groq API (LLM), ChromaDB in-memory (RAG vector store).

## Features Built

### 1. Email Triage
- Paste any email → AI classifies as IMPORTANT or SPAM
- Returns: label, reason, confidence (high/medium/low), priority (1-5)
- Gmail mode: fetch real inbox via Gmail MCP (mock fallback if OAuth not configured)
- Route: POST /api/triage

### 2. Email Thread Summarizer
- Paste a full email thread → AI extracts key information
- Returns: decided[], pending[], owners[], nextStep, sentiment
- Displays as 2x2 card grid with sentiment badge
- Route: POST /api/triage/summarize

### 3. Calendar Scheduling
- Input: meeting title, duration, preferred day, notes
- AI finds conflict-free slot in working hours (9am-6pm)
- Shows today/tomorrow schedule in sidebar
- Route: POST /api/calendar/schedule

### 4. Customer Support Reply
- Paste customer message → AI generates professional reply under 150 words
- Tone options: Make Formal, Make Friendlier, Regenerate
- Edit mode, Copy, Send Email via Gmail MCP
- Route: POST /api/support/generate

### 5. Meeting Brief Generator
- Input: person name, meeting topic, recent context
- AI generates 5-bullet brief: objective, discuss, questions, concerns, outcome
- Color coded cards with icons
- Route: POST /api/brief/generate

### 6. RAG Knowledge Base
- Upload company docs/policies as text
- Embeddings via @xenova/transformers (all-MiniLM-L6-v2, 384-dim)
- In-memory cosine similarity vector store
- Customer questions answered grounded in uploaded docs
- Shows "Grounded in X sources" badge
- Route: POST /api/rag/upload, POST /api/rag/reply

### 7. AI Command Bar (Killer Feature)
- Floating pill-shaped bar, activated with Ctrl+K
- Natural language controls all features
- Type "schedule meeting with Priya tomorrow" → auto-routes to calendar and books it
- Type "is this spam: you won $1M" → auto-classifies
- Command history stored, result shown in popup card
- Route: POST /api/command

## File Structure
ai-office-assistant/
├── backend/
│   ├── server.js
│   ├── .env (GROQ_API_KEY, PORT=3001)
│   ├── routes/
│   │   ├── triage.js
│   │   ├── calendar.js
│   │   ├── support.js
│   │   ├── brief.js
│   │   ├── rag.js
│   │   └── command.js
│   └── services/
│       ├── claudeService.js (Groq-powered)
│       ├── gmailService.js (MCP + mock fallback)
│       ├── calendarService.js (MCP + mock fallback)
│       └── ragService.js (in-memory vector store)
├── frontend/
│   ├── src/
│   │   ├── App.jsx (tabs + CommandBar)
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── EmailTriage.jsx (triage + thread summarizer)
│   │   │   ├── CalendarScheduler.jsx
│   │   │   ├── SupportReply.jsx
│   │   │   ├── MeetingBrief.jsx
│   │   │   ├── RAGKnowledge.jsx
│   │   │   └── CommandBar.jsx
│   │   └── styles/index.css
│   └── vite.config.js (proxy /api → localhost:3001)
├── CLAUDE.md
├── CONTEXT.md
└── README.md

## LLM Usage
- All AI calls go through Groq API (llama-3.1-8b-instant)
- Model chosen for: free tier, fast inference, good JSON output
- All prompts request JSON responses with strict schema
- JSON parsing always strips markdown fences before parsing

## MCP Integration
- Gmail MCP: https://gmail.mcp.claude.com/mcp (fetch emails, label, send)
- Calendar MCP: https://gcal.mcp.claude.com/mcp (read events, create events)
- Both fall back to realistic mock data if OAuth not configured

## RAG Pipeline
1. User uploads text document
2. Split into 500-char chunks with 50-char overlap
3. Embed with all-MiniLM-LM6-v2 (384 dimensions)
4. Store in in-memory cosine similarity store
5. On query: embed question, find top-3 similar chunks
6. Pass chunks as context to Groq
7. Return grounded reply with source count

## Key Design Decisions
- Groq instead of Anthropic API: free tier, sufficient quality for demo
- In-memory vector store instead of hosted ChromaDB: no external server needed
- Mock MCP fallbacks: app works without OAuth setup for demo purposes
- Ctrl+K command bar: shows agentic AI behavior to judges

## Hackathon Pitch Angle
"Most AI tools make you learn a new interface. Ours disappears into your workflow.
Press Ctrl+K, describe what you need in plain English, and your office runs itself."
