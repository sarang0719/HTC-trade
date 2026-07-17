# HTC Trade — Premium Paper Trading Platform

## Overview

HTC Trade is a premium fintech-inspired **paper trading platform** built as a full-stack TypeScript application. It simulates multi-asset trading (stocks, forex, ETFs) with features including watchlists, paper portfolios, order management, market news, educational content, and AI-powered insights via a chat interface. The app targets a Groww/INDmoney-like experience with a dark-first, premium UI aesthetic.

This is **not** a real trading platform — all trades are simulated (paper trading). The product focuses on simplicity, trust, and a polished fintech feel.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure

The project uses a three-folder monorepo pattern:

- **`client/`** — React SPA (Vite + TypeScript)
- **`server/`** — Express.js API server (TypeScript, runs via tsx)
- **`shared/`** — Shared types, schemas, and route definitions used by both client and server

### Frontend (client/)

- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter (lightweight client-side router) — routes defined in `client/src/App.tsx`
- **State/Data Fetching**: TanStack React Query for all server state
- **UI Components**: shadcn/ui (new-york style) with Radix UI primitives, Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming (dark-first design), custom glass-morphism effects. Fonts: Manrope (sans), Fraunces (serif), JetBrains Mono (mono)
- **Path aliases**: `@/` → `client/src/`, `@shared/` → `shared/`, `@assets/` → `attached_assets/`
- **Key patterns**:
  - `AppShell` component wraps all authenticated pages with sidebar navigation
  - Custom hooks in `client/src/hooks/` for each domain (portfolio, orders, watchlists, instruments, learn, market news, AI chat)
  - Zod validation on API responses in hooks (parse with logging)
  - Auth handled via `useAuth()` hook that checks `/api/auth/user`

### Backend (server/)

- **Framework**: Express.js on Node.js with TypeScript
- **Entry point**: `server/index.ts` creates HTTP server, registers routes
- **API design**: RESTful JSON API, all routes under `/api/`
- **Route definitions**: Shared route contracts in `shared/routes.ts` using Zod schemas — both client and server reference the same type-safe API definitions
- **Storage layer**: `server/storage.ts` implements `IStorage` interface using Drizzle ORM queries against PostgreSQL
- **Replit Integrations** (in `server/replit_integrations/`):
  - **Auth**: Replit OIDC authentication with Passport.js, session stored in PostgreSQL via `connect-pg-simple`
  - **Chat/AI**: Text-based chat with SSE streaming for AI assistant responses (conversations + messages model)
  - **Audio**: Voice chat capabilities (OpenAI integration for speech-to-text/text-to-speech) — currently unused by the UI
  - **Batch**: Utility for rate-limited batch processing of LLM calls
  - **Image**: Image handling routes

### Database

- **PostgreSQL** via Drizzle ORM
- **Schema**: Defined in `shared/schema.ts` with tables for:
  - `sessions`, `users` (auth — mandatory for Replit Auth)
  - `instruments`, `latest_prices` (market data)
  - `watchlists`, `watchlist_items`
  - `portfolios`, `holdings`
  - `orders`
  - `news_articles`, `learn_articles`
  - `conversations`, `messages` (AI chat, defined in `shared/models/chat.ts`)
- **Migrations**: Drizzle Kit with `drizzle-kit push` command (no migration files, direct push)
- **Config**: `drizzle.config.ts` reads `DATABASE_URL` env var

### Authentication

- **Replit Auth** (OpenID Connect) — users authenticate via Replit's OIDC provider
- Sessions stored in PostgreSQL `sessions` table
- `isAuthenticated` middleware protects private routes (portfolio, watchlists, orders)
- Public routes: instruments, market news, learn articles
- Client checks auth state via `/api/auth/user` endpoint

### Build & Deploy

- **Dev**: `npm run dev` — tsx runs the server, Vite dev server serves the client with HMR
- **Build**: `npm run build` — Vite builds client to `dist/public/`, esbuild bundles server to `dist/index.cjs`
- **Production**: `npm start` — serves the built bundle with static file serving
- Build script in `script/build.ts` bundles specific dependencies into the server bundle for faster cold starts

### Key Design Decisions

1. **Shared route contracts**: The `shared/routes.ts` file defines API paths, methods, input/output Zod schemas used by both client hooks and server handlers. This ensures type safety across the stack without code generation.

2. **Storage interface pattern**: `IStorage` interface in `server/storage.ts` abstracts database operations, making it possible to swap implementations.

3. **Dark-first theming**: CSS variables in `client/src/index.css` define a premium dark fintech palette with accent colors for gains (green) and losses (red). Light mode supported via Tailwind's `dark` class toggle.

4. **SSE streaming for AI chat**: The AI Insights page uses Server-Sent Events for streaming assistant responses, providing real-time typing effect.

## External Dependencies

### Database
- **PostgreSQL** — primary data store, required via `DATABASE_URL` environment variable

### Authentication
- **Replit Auth (OIDC)** — requires `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET` environment variables

### AI/LLM
- **OpenAI API** — used for AI chat/insights and optional voice features, configured via `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables

### Key NPM Packages
- **drizzle-orm** + **drizzle-kit** — database ORM and migration tooling
- **express** + **express-session** — HTTP server and session management
- **passport** + **openid-client** — authentication
- **zod** + **drizzle-zod** — runtime validation and schema generation
- **@tanstack/react-query** — client-side server state management
- **shadcn/ui** (Radix UI + Tailwind) — UI component library
- **wouter** — client-side routing
- **recharts** — dashboard charts (area charts for portfolio)
- **p-limit** + **p-retry** — batch processing utilities