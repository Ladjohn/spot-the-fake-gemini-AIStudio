# Spot The Fake: Viral News Edition

An AI-powered interactive game where players distinguish between real and fake viral news headlines.

## Architecture

- **Frontend**: React 19 + TypeScript + Vite 6, styled with Tailwind CSS (CDN)
- **API Server**: Express.js (`api-server.ts`) running on port 5001 via `tsx`
- **Frontend Dev Server**: Vite on port 5000, proxies `/api/*` to port 5001

## Key Files

- `App.tsx` - Main application and game state management
- `api-server.ts` - Local Express server wrapping API route handlers
- `api/openrouter.ts` - Proxy to OpenRouter LLM API for news generation
- `api/leaderboard.ts` - In-memory leaderboard (resets on restart)
- `services/geminiService.ts` - LLM integration with round caching
- `vite.config.ts` - Vite config (port 5000, proxy to 5001, allowedHosts: true)
- `start.sh` - Startup script: waits for API server before starting Vite

## Running

```bash
bash start.sh
```

Or directly: `npm run dev` (runs `tsx api-server.ts & vite`)

## Environment Variables

- `OPENROUTER_API_KEY` - Required for AI-generated news items (falls back to static content if missing)
- `GEMINI_API_KEY` - Alternative AI key (currently unused in active code)

## Deployment

Configured as autoscale deployment:
- Build: `npm run build`
- Run: `npx tsx api-server.ts & npx vite preview --port 5000 --host 0.0.0.0`

Note: The leaderboard uses in-memory storage and will reset on server restart.
