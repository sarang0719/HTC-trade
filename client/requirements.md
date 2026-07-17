## Packages
(none needed)

## Notes
Uses existing shadcn/ui components in client/src/components/ui
Uses existing Replit Auth hook at client/src/hooks/use-auth.ts
AI Insights uses existing text chat endpoints:
- GET /api/conversations
- POST /api/conversations
- GET /api/conversations/:id
- POST /api/conversations/:id/messages (SSE streaming: data: {"content": "..."} and data: {"done": true})
Market/news & learn endpoints are public; portfolio/watchlists/orders are auth-protected (401)
Copy Audio worklet to public only if enabling voice; this UI uses text chat only (no audio)
Tailwind fonts already configured via CSS vars; no tailwind.config changes required
