# AutoMax — Automation Platform

## Tech Stack
- Next.js 16, TypeScript, Prisma, PostgreSQL (Neon)
- Tailwind CSS, JWT auth

## Architecture
- lib/actions/ — individual action modules (send_email, send_whatsapp, ai_process, sheets_read, sheets_append)
- lib/actions/index.ts — action registry (Record<string, Function>)
- lib/engine/workflowEngine.ts — processes events, matches workflows, runs steps
- lib/events/eventBus.ts — emitEvent(name, payload) entry point
- lib/integrations/ — external API wrappers (ai.ts, whatsapp.ts)
- app/api/ — Next.js API routes

## Action Result Type
type ActionResult = { success: boolean; result?: any; error?: any }

## Current Actions
send_email, send_whatsapp, ai_process, sheets_read, sheets_append

## Rules
- Keep actions modular and decoupled
- No circular imports
- Always use TypeScript types
- Always use @/ import alias