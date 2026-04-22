AutoMax — Project Context

> Read this entire file before writing any code, giving any advice, or making any decisions.

---

## WHAT IS AUTOMAX

AutoMax is a Zapier-like business automation platform built specifically for Indian small businesses.
Users log in, create workflows, and those workflows run automatically based on triggers.

A workflow has:

- One **trigger** — what starts it (schedule/cron, webhook, WhatsApp message, or manual run)
- One or more **steps** — what it does (send email, send WhatsApp, call AI, read/write Google Sheets, evaluate a condition)

The platform is live in production at https://automaxv1.vercel.app

Owner: Logeshwaran P, Chennai, Tamil Nadu, India
Skill level: Some coding knowledge — not a developer by trade
Tools: VS Code + GitHub Copilot Chat, PowerShell terminal, Windows 11
Goal: Production SaaS platform — currently fixing all identified bugs, then growing features

---

## TECH STACK

| Layer            | Technology                                                               |
| ---------------- | ------------------------------------------------------------------------ |
| Framework        | Next.js (App Router, TypeScript, Turbopack) — package.json shows ^16.2.1 |
| Database         | PostgreSQL via Neon (ap-southeast-1 region)                              |
| ORM              | Prisma v5.22.0                                                           |
| Styling          | Tailwind CSS ^3.4.0                                                      |
| Auth             | JWT — bcryptjs + jsonwebtoken — cookie name: "auth-token" (HttpOnly)     |
| Primary AI       | Groq API — model: llama-3.3-70b-versatile                                |
| Fallback AI      | Gemini API — model: gemini-2.0-flash                                     |
| Email            | Resend SDK — from: onboarding@resend.dev (shared domain, spam risk)      |
| WhatsApp         | WAHA — runs LOCALLY ONLY, broken in production                           |
| Sheets           | Google Sheets API (googleapis) via service account                       |
| Queue            | BullMQ ^5.74.1 + Upstash Redis (ap-southeast-1, free tier)               |
| Validation       | zod ^3.25.76 — DO NOT upgrade or touch                                   |
| Forms            | react-hook-form + @hookform/resolvers                                    |
| State            | zustand ^4.4.0                                                           |
| HTTP client      | axios ^1.14.0                                                            |
| Worker runner    | tsx ^4.21.0                                                              |
| Billing (unused) | razorpay ^2.9.6 — installed, NOT being used                              |
| Icons            | lucide-react ^1.8.0                                                      |
| Dead dependency  | nodemailer + @types/nodemailer — should be uninstalled                   |

**Deployments:**

- Frontend + API: Vercel (Hobby plan) — https://automaxv1.vercel.app
- Background worker: Railway — service named "AutoMax", ~$1.76 credits left as of April 19 2026
- Database: Neon PostgreSQL (ap-southeast-1)
- Redis: Upstash (ap-southeast-1, free tier)
- GitHub: https://github.com/logeshwaran27parthipan-lang/AutoMax
- WAHA: runs locally only — NOT on Railway

---

## PROJECT FILE STRUCTURE

app/
page.tsx ← Landing page, auth-aware navbar
layout.tsx
globals.css
proxy.ts ← Renamed from middleware.ts. Export named "proxy" — BUG (should be "middleware")
(auth)/
login/page.tsx
register/page.tsx
(dashboard)/
layout.tsx ← Mobile: top header (logo + Settings + Billing + Logout) + bottom nav (5 items)
dashboard/
page.tsx ← Stats grid + quick actions
settings/page.tsx
ai/page.tsx ← Has Groq parsing bug
email/page.tsx
whatsapp/page.tsx ← WAHA local only, broken in production
billing/page.tsx ← Mock mode, billing skipped for now
workflows/
page.tsx
[id]/page.tsx
api/
ai/route.ts
auth/
login/route.ts
logout/route.ts
register/route.ts ← Auto-creates org + OWNER membership on register
cron/route.ts ← Uses enqueueWorkflow (correct). Has isActive + run-lock guard.
email/route.ts ← NO AUTH CHECK — security bug
org/
api-key/route.ts ← Returns orgName, apiKey, subscriptionStatus, planId
sheets/route.ts
test/route.ts
test-event/route.ts
webhook/[workflowId]/route.ts ← Uses emitEvent not enqueueWorkflow — bug
whatsapp/
send/route.ts ← Has auth check
status/route.ts
incoming/route.ts
workflows/
route.ts
[id]/route.ts
[id]/runs/route.ts
[id]/run/route.ts
billing/
subscribe/route.ts ← Mock — sets DB directly. Billing skipped.
webhook/route.ts
lib/
actions/
index.ts
sendEmail.ts ← Single receiver only — needs multiple receiver support
sendWhatsapp.ts ← Single receiver only — needs multiple receiver support
analyzeAI.ts
aiDecision.ts
sheetsRead.ts
sheetsAppend.ts
ai/
aiClient.ts
validateAI.ts
engine/
workflowEngine.ts ← Loads ALL workflows (no org isolation) — bug
runLogger.ts
events/
eventBus.ts
memory/
memoryService.ts
integrations/
ai.ts
whatsapp.ts
queue/
queueClient.ts ← Top-level throw if UPSTASH_REDIS_URL missing — bug
workflowWorker.ts
utils/
interpolate.ts ← Silently swallows unknown {{variables}} — bug
extractor.ts
auth.ts
prisma.ts
gmail.ts
sheets.ts
supabase.ts ← Legacy stub, not used, confusing
whatsapp.ts
razorpay.ts
validations/
workflow.ts
worker.mjs ← Uses spawnSync — blocks process, crash loop risk on Railway
vercel.json ← maxDuration: 60 on three routes — does nothing on Hobby plan
fix-bom.js ← MUST run after every file save

---

## DATABASE SCHEMA

> NEVER modify schema without running: prisma migrate dev + prisma generate

```prisma
model User {
  id             String               @id @default(uuid())
  email          String               @unique
  password       String
  name           String?
  createdAt      DateTime             @default(now()) @map("created_at")
  workflows      Workflow[]
  conversations  Conversation[]
  workflowRuns   WorkflowRun[]
  orgMemberships OrganizationMember[]
  @@map("users")
}

model Workflow {
  id          String        @id @default(uuid())
  name        String
  description String?
  triggers    Json?
  steps       Json?
  isActive    Boolean       @default(true) @map("is_active")
  createdAt   DateTime      @default(now()) @map("created_at")
  userId      String        @map("user_id")
  user        User          @relation(fields: [userId], references: [id])
  orgId       String?       @map("org_id")
  org         Organization? @relation(fields: [orgId], references: [id])
  runs        WorkflowRun[]
  @@map("workflows")
}

model Organization {
  id                 String               @id @default(uuid())
  name               String
  apiKey             String               @unique @map("api_key")
  createdAt          DateTime             @default(now()) @map("created_at")
  subscriptionStatus String               @default("inactive") @map("subscription_status")
  planId             String?              @map("plan_id")
  razorpaySubId      String?              @map("razorpay_sub_id")
  members            OrganizationMember[]
  workflows          Workflow[]
  workflowRuns       WorkflowRun[]
  @@map("organizations")
}

model OrganizationMember {
  id        String       @id @default(uuid())
  userId    String       @map("user_id")
  orgId     String       @map("org_id")
  role      String       @default("owner")
  createdAt DateTime     @default(now()) @map("created_at")
  user      User         @relation(fields: [userId], references: [id])
  org       Organization @relation(fields: [orgId], references: [id])
  @@map("organization_members")
}

model WorkflowRun {
  id         String            @id @default(uuid())
  workflowId String            @map("workflow_id")
  userId     String            @map("user_id")
  status     String            @default("running")
  trigger    String?
  payload    Json?
  startedAt  DateTime          @default(now()) @map("started_at")
  finishedAt DateTime?         @map("finished_at")
  workflow   Workflow          @relation(fields: [workflowId], references: [id])
  user       User              @relation(fields: [userId], references: [id])
  orgId      String?           @map("org_id")
  org        Organization?     @relation(fields: [orgId], references: [id])
  steps      WorkflowRunStep[]
  @@map("workflow_runs")
}

model WorkflowRunStep {
  id         String      @id @default(uuid())
  runId      String      @map("run_id")
  stepIndex  Int         @map("step_index")
  stepType   String      @map("step_type")
  status     String
  output     Json?
  error      String?
  startedAt  DateTime    @default(now()) @map("started_at")
  finishedAt DateTime?   @map("finished_at")
  run        WorkflowRun @relation(fields: [runId], references: [id])
  @@map("workflow_run_steps")
}
```

---

## ENVIRONMENT VARIABLES

| Variable                   | Purpose                  | Notes                                       |
| -------------------------- | ------------------------ | ------------------------------------------- |
| DATABASE_URL               | Neon PostgreSQL          | Must be in .env                             |
| JWT_SECRET                 | JWT signing              |                                             |
| RESEND_API_KEY             | Email sending via Resend |                                             |
| UPSTASH_REDIS_URL          | BullMQ queue via Upstash | Format: rediss://default:PASSWORD@HOST:PORT |
| GROQ_API_KEY               | Primary AI (Groq)        |                                             |
| GEMINI_API_KEY             | Fallback AI (Gemini)     |                                             |
| GOOGLE_SERVICE_ACCOUNT_KEY | Google Sheets API        |                                             |
| CRON_SECRET                | Protects cron route      |                                             |
| WEBHOOK_SECRET             | Protects webhook route   |                                             |
| RAZORPAY_KEY_ID            | Billing (unused)         | Installed, not active                       |
| RAZORPAY_KEY_SECRET        | Billing (unused)         | Installed, not active                       |
| WAHA_URL                   | WhatsApp via WAHA        | Local only, broken in production            |

---

## COMPLETED WORK — ALL PHASES

**Phases 1–12: Core platform**
Workflow engine (triggers, steps, conditions), auth system (register/login/logout), email sending via Resend, WhatsApp via WAHA, Google Sheets read/append, AI decision steps, webhook/schedule/manual/WhatsApp triggers, run history with step-level logging, landing page, cron with isActive guard and run-lock guard. All live on Vercel.

**Phase 14: BullMQ + Upstash Redis queue**
lib/queue/queueClient.ts — BullMQ Queue + enqueueWorkflow() function, parses rediss:// URL format.
lib/queue/workflowWorker.ts — BullMQ Worker calling processEvent().
cron/route.ts updated to use enqueueWorkflow instead of emitEvent.
Railway worker service online and running.

**Phase 15: Multi-tenant (organizations + API keys)**
Organization model + OrganizationMember model in schema.
Register endpoint auto-creates an org and OWNER membership.
/api/org/api-key GET returns orgName + apiKey + subscriptionStatus + planId.
/api/org/api-key PATCH regenerates API key.
Avatar on dashboard shows org name initials.

**Phase 16: Mock billing**
/api/billing/subscribe sets subscriptionStatus="active" directly in DB (no real payment).
Billing page shows plan status and upgrade button.
Owner is NOT doing real Razorpay billing — skipping entirely for now.

**Full UI/UX pass — all dashboard pages**
layout.tsx: mobile top header (logo + Settings + Billing + Logout) + fixed bottom nav (5 items: Dashboard, Workflows, Email, WhatsApp, AI).
All 8 dashboard pages use clamp() font sizes and auto-fit minmax grids.
All pages confirmed mobile-responsive by owner.

**Full project audit**
Complete read of all source files. 21 issues identified across 4 categories: bugs, missing features, code quality, infrastructure. Full list reviewed and confirmed with owner.

---

## DESIGN SYSTEM — LOCKED

- Background: warm white #FAFAFA
- Text: deep navy #1A1A2E
- Accent: amber #F59E0B
- Font: Inter
- No dark mode — ever
- AutoMax logo: "Auto" in dark #1A1A2E + "Max" in amber #F59E0B
- Auth pages background: linear-gradient(135deg, #FFFBF0 0%, #F5F5F0 100%)
- All dashboard pages use inline style={{ }} ONLY — no Tailwind classes in dashboard components
- Landing page (page.tsx): Tailwind classes are OK
- Dashboard sidebar logo links to /
- Mobile bottom nav: max 5 items. Settings/Billing/Logout in top header.

---

## CURRENT STATE

Full audit complete. The next actions are fixing bugs in this exact order:

1. **BUG #1** — Fix queueClient.ts lazy init (lib/queue/queueClient.ts)
2. **BUG #2** — Fix Groq AI response parsing (app/(dashboard)/dashboard/ai/page.tsx)
3. **BUG #5** — Add auth check to email route (app/api/email/route.ts)
4. **BUG #3** — Fix webhook route emitEvent → enqueueWorkflow (app/api/webhook/[workflowId]/route.ts)
5. **BUG #6** — Fix worker.mjs spawnSync (change Railway start command)
6. **BUG #7** — Fix proxy.ts export name (proxy.ts)
7. **BUG #4** — Fix dashboard recent runs (add /api/runs route)
8. **MISSING #8** — Multiple receivers for email + WhatsApp
9. **MISSING #11** — isActive toggle in workflow list UI
10. **MISSING #10** — Global run history page
11. **MISSING #12** — Show step error messages in UI
12. **MISSING #9** — AI assistant context-awareness (direction TBD)
13. **CODE #16** — workflowEngine org isolation
14. **CODE #17** — interpolate() warn on unknown variables
15. **CODE #14** — Uninstall nodemailer dead dependency
16. **CODE #18** — supabase.ts legacy comment/cleanup
17. **INFRA #19** — Railway billing card (owner action)
18. **INFRA #20** — WAHA production hosting (decision TBD)
19. **INFRA #21** — Custom domain for email (owner action, ₹750/year)

---

## LOCKED DECISIONS — DO NOT REVISIT

- Engine stays generic — no hardcoded logic in workflowEngine.ts
- Validation lives in each action file, not the engine
- AI output never trusted — always validate before executing
- No circular imports in lib/
- Always @/ alias in Next.js files; relative imports in worker files
- BullMQ queue name: "workflow-queue" — never change
- Cookie name: "auth-token" — never change
- Prisma needs .env for DATABASE_URL
- zod at ^3.25.76 — do NOT touch
- Dashboard pages use inline style={{ }} only — no Tailwind
- Landing page: Tailwind is fine
- Auth pages: gradient background as above
- Mobile bottom nav: max 5 items
- Billing/Razorpay: SKIPPING for now
- WAHA: decision pending (cloud host vs alternative vs deprioritise)
- AI assistant: decision pending (context-aware chat vs command executor vs guided help)
- localStorage keys: "automax_logged_in" and "automax_initials"
- role: "OWNER" uppercase in /api/org/api-key/route.ts
- Dashboard route is /dashboard (NOT /dashboard/dashboard)
- middleware.ts renamed to proxy.ts, export named "proxy" (known issue — BUG #7)

---

## FAILED APPROACHES — DO NOT REPEAT

**Bottom nav with all 7 items**
Overflows at 360px viewport. Mobile bottom nav max 5 items. Settings/Billing/Logout go in top header.

**CSS className + style block for responsive grids**
Content still cut off in practice. Use inline style with auto-fit minmax — simpler, more reliable.

**document.cookie check for auth-token**
auth-token is HttpOnly — invisible to JavaScript. Always use API call (/api/org/api-key) to check auth state client-side.

**Three-column balanced navbar**
Avatar appeared at screen edge. Use justify-between with logo left, everything else in a right-side div.

**window.location.href redirect before awaiting initials fetch**
Redirect fired before fetch completed — initials never saved. Always await /api/org/api-key before redirecting after login.

**Run Now executing steps directly in the route**
Bypassed workflowEngine — no run history, ai_decision never fired. NEVER execute steps in a route. Always call processEvent().

**Two workflows scheduled at the same UTC minute**
Both crons fire simultaneously → Vercel 500. Stagger cron times. Queue system fixes permanently.

---

## CRITICAL RULES — NEVER BREAK

1. Engine stays generic — no hardcoded action logic
2. Validation in each action file — not in engine
3. AI is NOT trusted — always validate before executing
4. No circular imports
5. Always @/ alias in Next.js app files; relative imports in worker files
6. BOM breaks Turbopack silently — ALWAYS run: node fix-bom.js "path/to/file.ts" after every file save
7. zod must stay at ^3.25.76
8. Never run npm audit fix --force
9. Prisma needs .env file for DATABASE_URL
10. Use $env:DATABASE_URL="..." in PowerShell for prisma commands
11. Next.js 15+ requires await context.params in API routes
12. Cookie name is "auth-token" everywhere
13. PowerShell Out-File adds BOM — never write TS files with it
14. Always use NextRequest/NextResponse in API routes
15. Give complete Copilot Chat prompts — never snippets
16. One task at a time — never multiple files in one response
17. After ANY schema change: prisma migrate dev + prisma generate
18. After ANY file edit: node fix-bom.js on that file
19. NEVER execute workflow steps inside an API route
20. Always git status before pushing
21. NEVER use curl in PowerShell
22. Do NOT run npm audit fix
23. Dashboard pages use inline style={{ }} only — no Tailwind
24. auth-token is HttpOnly — never try document.cookie to check login state
25. Always await /api/org/api-key before redirecting after login

---

## LESSONS LEARNED

- Groq returns OpenAI response shape: data.choices[0].message.content — NOT Gemini shape
- Gemini returns: data.candidates[0].content.parts[0].text
- /api/email has no auth guard — always check every API route for auth when reviewing
- workflowEngine.findMany() has no where clause — will be a real problem at scale
- webhook route was missed when cron was updated to use enqueueWorkflow — always check ALL trigger entry points when changing one
- proxy.ts middleware export name is technically wrong — auth redirect may silently not work
- BOM -> silent 404 -> always run fix-bom.js after every file save
- Next.js 15+: await context.params in dynamic routes
- WAHA uses X-Api-Key header (not Authorization Bearer)
- WAHA endpoint is /api/sendText, body: { session, chatId, text }
- chatId format: "919876543210@c.us"
- Webhook secret: only reject if BOTH configured AND wrong (not if missing)
- JSX div mismatches cause "Expected a semicolon" in Turbopack
- isActive guard in cron/route.ts must come BEFORE matchesCron()
- v0.dev preview errors don't mean the code is wrong — test locally
- Two deployment IDs in Vercel logs = normal deploy, not a bug
- auth-token is HttpOnly — never try to read it with document.cookie
