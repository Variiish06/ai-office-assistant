# AI Office Assistant — Hackathon Project

## Rules
- Always use claude-sonnet-4-20250514 as the model
- Backend runs on port 3001, frontend on port 5173
- Never hardcode API keys — always use .env
- After creating each file, confirm it was written successfully
- Install all npm dependencies before writing any code that imports them
- If an MCP call fails, fall back to mock data and log a warning

## Stack
- Backend: Node.js + Express + @anthropic-ai/sdk
- Frontend: React + Vite
- AI: Anthropic API (direct, no LangChain)
