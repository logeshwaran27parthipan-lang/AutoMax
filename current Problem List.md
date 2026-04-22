# AutoMax — Problem List
> This file contains every known issue in the codebase as of April 2026.
> 21 issues total. 7 bugs, 6 missing features, 5 code quality, 3 infrastructure.
> Every issue is fully detailed for unambiguous fixing.

---

## BUG #1 — queueClient.ts crashes entire cron on missing env var

**File:** `lib/queue/queueClient.ts`
**Category:** Bug — Runtime crash
**Priority:** HIGHEST — fix first

**What the code does now:**
At the very top of the module, outside any function, there is a line like:
```ts
if (!process.env.UPSTASH_REDIS_URL) throw new Error("UPSTASH_REDIS_URL is not set");
```
This runs at module load time — the moment any file imports from queueClient.ts.

**Why this is dangerous:**
When Vercel redeploys (which can happen on any push, env var change, or automatic cycle), all modules are re-imported. If UPSTASH_REDIS_URL is momentarily missing from the environment — even for one deploy — importing queueClient.ts causes an unhandled exception. This crash propagates to every file that imports from it, which includes cron/route.ts. The entire cron route returns 500. All scheduled workflows stop firing silently. The user sees nothing wrong in the UI, but no automations run.

**What the fix must do:**
- Remove the top-level throw entirely
- Make the Redis connection lazy — only establish it when enqueueWorkflow() is actually called
- If UPSTASH_REDIS_URL is missing when enqueueWorkflow() is called, log a console.warn and return early — do not throw
- The Queue instance must be cached after first creation (don't reconnect on every call)
- Export only: getQueue() and enqueueWorkflow(workflowId, payload)
- Do NOT export the Queue instance directly

**Correct pattern:**
```ts
let workflowQueue: Queue | null = null;

function getQueue(): Queue | null {
  if (workflowQueue) return workflowQueue;
  if (!process.env.UPSTASH_REDIS_URL) {
    console.warn("[queueClient] UPSTASH_REDIS_URL is not set — skipping queue init");
    return null;
  }
  // parse URL and create Queue here
  return workflowQueue;
}

export async function enqueueWorkflow(workflowId: string, payload: Record): Promise {
  const queue = getQueue();
  if (!queue) {
    console.warn("[queueClient] Queue not available — skipping enqueue for:", workflowId);
    return;
  }
  await queue.add("run-workflow", { workflowId, ...payload });
}
```

---

## BUG #2 — AI page shows raw JSON instead of readable response for Groq

**File:** `app/(dashboard)/dashboard/ai/page.tsx`
**Category:** Bug — Wrong output shown to user
**Priority:** High — every Groq user sees broken output

**What the code does now:**
The response parser in the frontend always reads the AI response using the Gemini response shape:
```ts
data?.candidates?.[0]?.content?.parts?.[0]?.text
```
This works when the selected model is Gemini. But when the user selects Groq (which is the PRIMARY and default model), this path returns undefined because Groq uses the OpenAI response shape, not the Gemini shape.

When candidates[0]... is undefined, the code either shows nothing, shows "undefined", or falls back to showing the entire raw JSON object stringified — which is what users see: a wall of raw JSON.

**What Groq actually returns:**
```json
{
  "choices": [
    {
      "message": {
        "content": "The actual AI response text here"
      }
    }
  ]
}
```

**What Gemini actually returns:**
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          { "text": "The actual AI response text here" }
        ]
      }
    }
  ]
}
```

**What the fix must do:**
In the response handler in ai/page.tsx, branch based on which model was selected:
```ts
const text = selectedModel === "groq"
  ? data?.choices?.[0]?.message?.content
  : data?.candidates?.[0]?.content?.parts?.[0]?.text;
```
Both paths must use optional chaining (?.) to avoid crashing if the shape is unexpected.

---

## BUG #3 — Webhook trigger runs workflow synchronously, times out on Vercel

**File:** `app/api/webhook/[workflowId]/route.ts`
**Category:** Bug — Timeout / silent failure
**Priority:** High — all webhook-triggered workflows are unreliable

**What the code does now:**
When an external service POSTs to /api/webhook/[workflowId], the route calls:
```ts
emitEvent("webhook_trigger", { workflowId, ...body })
```
emitEvent is a synchronous in-process event. This means the workflow engine runs the full workflow — all steps — synchronously inside the Vercel serverless function, before returning a response.

**Why this breaks:**
Vercel Hobby plan has a hard 10-second function timeout. Any workflow with more than 1-2 steps, or any step that makes an external API call (email, WhatsApp, AI, Sheets), will likely exceed 10 seconds. Vercel kills the function mid-execution. The workflow is partially complete or fully failed. The webhook caller gets a 504 timeout. The user sees a failed run with no meaningful error.

**What cron/route.ts does correctly (the right pattern):**
```ts
await enqueueWorkflow(workflowId, { userId, trigger: "schedule", payload: {} });
return NextResponse.json({ ok: true }); // returns immediately
```
The worker on Railway picks up the job and runs it in the background — no timeout risk.

**What the fix must do:**
Replace the emitEvent call with enqueueWorkflow, then return 200 immediately:
```ts
await enqueueWorkflow(workflowId, { userId, trigger: "webhook", payload: body });
return NextResponse.json({ received: true });
```
Also verify the userId is correctly extracted from the workflow record (fetch the workflow by ID to get its userId, since the webhook caller doesn't provide auth).

---

## BUG #4 — Dashboard "recent runs" only shows runs from the first workflow

**File:** `app/(dashboard)/dashboard/page.tsx`
**Category:** Bug — Wrong data shown
**Priority:** Medium

**What the code does now:**
The dashboard page fetches recent runs with something like:
```ts
fetch(`/api/workflows/${workflowsArray[0].id}/runs`)
```
This hardcodes to the first workflow in the array (index 0). If the user has multiple workflows, runs from workflows 2, 3, 4... never appear on the dashboard. If the user has no workflows, workflowsArray[0] is undefined and the fetch crashes.

**Why this is wrong:**
The dashboard is supposed to show a global activity feed — recent runs across ALL workflows. Showing only the first workflow's runs is misleading and breaks the core utility of the dashboard overview.

**What the fix must do:**
1. Create a new API route: `app/api/runs/route.ts`
   - Requires auth (JWT verification)
   - Fetches the last 20 WorkflowRun records for the authenticated user across all workflows
   - Ordered by startedAt DESC
   - Returns: id, workflowId, workflowName, status, trigger, startedAt, finishedAt
2. Update dashboard/page.tsx to call `/api/runs` instead of the per-workflow endpoint

---

## BUG #5 — Email API route has no authentication check

**File:** `app/api/email/route.ts`
**Category:** Bug — Security vulnerability
**Priority:** High — fix immediately

**What the code does now:**
The route handles POST requests to send emails via Resend. It has NO JWT verification at the top. It reads the request body and calls the Resend API directly without confirming the caller is a logged-in user.

**Why this is a serious problem:**
Anyone on the internet who discovers the URL https://automaxv1.vercel.app/api/email can POST to it and send unlimited emails using AutoMax's Resend API quota. The account is on the free Resend plan — this can exhaust the quota instantly. It can also be used to send spam, phishing emails, or abuse campaigns using AutoMax's sender identity. This is a critical security hole.

**What the correct pattern looks like (from /api/whatsapp/send/route.ts):**
```ts
const token = request.cookies.get("auth-token")?.value;
if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const user = verifyToken(token);
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

**What the fix must do:**
Add those exact lines at the very top of the POST handler in email/route.ts, before reading the request body or doing anything else.

---

## BUG #6 — worker.mjs uses spawnSync, causing Railway crash loops

**File:** `worker.mjs`
**Category:** Bug — Infrastructure crash risk
**Priority:** Medium

**What the code does now:**
worker.mjs uses Node's spawnSync to launch the TypeScript worker:
```js
spawnSync("npx", ["tsx", "lib/queue/workflowWorker.ts"], { stdio: "inherit" });
```
spawnSync is synchronous — it blocks the Node.js process entirely until the spawned process exits. If tsx or the worker crashes for any reason (syntax error, missing env var, import failure), spawnSync returns immediately. The outer process exits. Railway detects the crash and restarts. The restart hits the same error. Railway goes into an infinite crash loop. Logs fill up with unhelpful restart noise and the actual error is buried.

**What the fix must do:**
Remove worker.mjs entirely as the entry point. Change the Railway service start command directly to:
npx tsx lib/queue/workflowWorker.ts
This runs the worker directly — no wrapper. If it crashes, Railway shows the actual error in logs. No crash loop amplification.

---

## BUG #7 — proxy.ts has wrong export name for Next.js middleware

**File:** `proxy.ts` (project root — renamed from middleware.ts)
**Category:** Bug — Silent auth redirect failure
**Priority:** Medium

**What the code does now:**
The file is named proxy.ts and exports a function named "proxy":
```ts
export function proxy(request: NextRequest) { ... }
```

**Why this is wrong:**
Next.js middleware REQUIRES the file to be named middleware.ts (or middleware.js) AND the export must be named "middleware". The framework specifically looks for:
```ts
export function middleware(request: NextRequest) { ... }
```
If either the filename or the export name is wrong, Next.js silently ignores the entire middleware. No error is thrown. The matcher config does nothing.

**What breaks silently:**
The middleware is responsible for redirecting unauthenticated users away from /dashboard routes. If the middleware is not running, users who are not logged in can potentially access dashboard URLs directly (though API calls will still fail with 401). The auth protection layer is simply not executing.

**What the fix must do:**
Either:
- Option A: Rename proxy.ts to middleware.ts AND change the export from "proxy" to "middleware"
- Option B: Keep the file named proxy.ts but add at the bottom: `export { proxy as middleware }`

Option A is cleaner. Option B works if renaming the file causes other issues.

---

## MISSING #8 — Email and WhatsApp steps only support one recipient

**Files:** `lib/actions/sendEmail.ts`, `lib/actions/sendWhatsapp.ts`
**Category:** Missing feature
**Priority:** High — critical for business use cases

**What the code does now:**
Both action files accept a single "to" value — one email address or one phone number. The step config in a workflow can only target one person.

**Why this is needed:**
In real business automation, you often need to notify multiple people — a whole team, or a customer list. For example: "When a new lead comes in, email the sales team (3 people)" or "Send WhatsApp confirmation to both the customer and the manager." Without multiple receivers, users have to create duplicate workflow steps for each recipient, which is clunky and non-scalable.

**What the fix must do:**

In sendEmail.ts:
- Accept `to` as a string
- Split by comma: `const recipients = to.split(",").map(s => s.trim()).filter(Boolean)`
- Loop and send to each recipient (or use Resend's array support if available)

In sendWhatsapp.ts:
- Accept `to` as a string
- Split by comma the same way
- Loop and call WAHA sendText for each number

In the workflow builder UI (workflows/[id]/page.tsx):
- Add a hint text below the "to" field saying: "For multiple recipients, separate with commas"

---

## MISSING #9 — AI assistant has no awareness of user's workflows or data

**File:** `app/(dashboard)/dashboard/ai/page.tsx`
**Category:** Missing feature
**Priority:** Medium — decision on direction still pending

**What the code does now:**
The AI chat page sends user messages directly to Groq/Gemini with no system context. It is a generic chatbox — the AI has no idea what AutoMax is, who the user is, what workflows they have, or what their recent run history looks like.

**Why this matters:**
The AI assistant is positioned as a smart helper for automation. But if a user asks "Why did my workflow fail yesterday?" or "How many runs did I have this week?", the AI has no data to answer with. It cannot help with anything specific to the user's AutoMax account.

**What the fix should do (pending direction decision):**
Before sending a message to the AI API, fetch:
- /api/workflows — list of user's workflows (name, isActive, trigger type)
- /api/runs — last 10 runs (status, workflowName, trigger, timestamp)

Inject this as a system prompt:
You are an automation assistant for AutoMax. Here is the user's current data:
Workflows: [JSON list]
Recent runs: [JSON list]
Answer questions about their automations, help them debug failures, and suggest improvements.
Then send the user's message as the human turn.

---

## MISSING #10 — No global run history page

**Files:** Missing — needs new page at `app/(dashboard)/dashboard/runs/page.tsx`
**Category:** Missing feature
**Priority:** Medium

**What exists now:**
Run history is only visible by clicking into a specific workflow at /dashboard/workflows/[id]. There is no page that shows all runs across all workflows together.

**Why this is needed:**
Users want to see "What happened today across all my automations?" at a glance. Having to click into each workflow individually to check its runs is slow and impractical when you have 5+ workflows.

**What the fix must do:**
1. Create /api/runs/route.ts (also needed for BUG #4 — shared fix)
   - Auth required
   - Returns last 50 runs across all user workflows, newest first
   - Includes: run id, workflow name, status, trigger, startedAt, finishedAt
2. Create app/(dashboard)/dashboard/runs/page.tsx
   - Shows a table/list of all runs
   - Columns: Workflow Name, Status (coloured), Trigger, Started At, Duration
   - Links each row to the workflow detail page
   - Mobile responsive using inline style={{ }} only
3. Add "Runs" to the bottom nav or dashboard quick actions

---

## MISSING #11 — No isActive toggle in the workflow list UI

**File:** `app/(dashboard)/dashboard/workflows/page.tsx`
**Category:** Missing feature
**Priority:** Medium-High

**What exists now:**
The Workflow model has an isActive Boolean field. The cron route checks isActive before firing a workflow — inactive workflows are skipped. But there is no way in the UI to toggle a workflow active or inactive. The field exists in the database and is respected by the cron, but users have no control over it from the browser.

**Why this is needed:**
Users need to be able to pause a workflow without deleting it. "My client campaign is over, pause this workflow for now" is a basic need. Without a toggle, the only option is deletion — which loses all configuration.

**What the fix must do:**
In workflows/page.tsx, on each workflow card:
- Add a toggle switch (styled inline, no Tailwind)
- The toggle reflects the current isActive value from the API
- On toggle click, send: PATCH /api/workflows/[id] with body { isActive: !currentValue }
- Update the local state optimistically after the PATCH succeeds
- Show the workflow as visually "dimmed" or "paused" when isActive is false

---

## MISSING #12 — Workflow step errors not visible in the UI

**Files:** `app/(dashboard)/dashboard/workflows/[id]/page.tsx`
**Category:** Missing feature
**Priority:** Medium

**What exists now:**
When a workflow run fails, the run is marked as status "failed". The WorkflowRunStep table stores an `error` field with the actual error message for each step. But the run detail view in the UI only shows the overall "failed" status — it does not surface the step-level error messages. Users can see that something failed but have no idea which step failed or why.

**Why this is needed:**
Debugging broken workflows is impossible without error details. "Step 2 failed: Resend API returned 422 — invalid email address" is actionable. "Status: failed" is not. This is the most basic debugging capability a workflow platform must have.

**What the fix must do:**
In the workflow run detail view (workflows/[id]/page.tsx):
- When displaying each step's result, check if the step has an `error` field
- If error is present, display it in a red/orange error box below the step
- Style inline (no Tailwind), use a warm red like #DC2626 or amber #F59E0B for warning
- Make the error text selectable so users can copy it

---

## MISSING #13 — WhatsApp page shows "start WAHA locally" in production

**File:** `app/(dashboard)/dashboard/whatsapp/page.tsx`
**Category:** Missing feature / UX problem
**Priority:** Medium — decision on WAHA hosting pending

**What the code does now:**
When the WhatsApp status check fails (because WAHA is not running in production), the error handler shows a hardcoded message like:
"WAHA not running — start WAHA locally first"

**Why this is wrong:**
This is an internal developer message. Real users on https://automaxv1.vercel.app see this and have no idea what WAHA is or what "start locally" means. It makes the product look broken and unfinished.

**What the fix must do:**
Option A (if WAHA will be cloud hosted): Deploy WAHA to Railway and update WAHA_URL env var.
Option B (if WAHA is being deprioritised): Replace the error state in the UI with a friendly message:
"WhatsApp integration is coming soon. We're working on bringing this feature to all users."
Style it as a feature-coming-soon banner, not an error.

Decision is pending from owner. Until decided, at minimum change the error message to Option B.

---

## CODE #14 — nodemailer is a dead dependency

**Files:** `package.json`, possibly imported somewhere in lib/
**Category:** Code quality
**Priority:** Low

**What exists:**
nodemailer and @types/nodemailer are installed in package.json. The project switched to Resend SDK for email sending. nodemailer is no longer used anywhere. It's dead weight that increases install time, bundle analysis noise, and potential security surface.

**What the fix must do:**
npm uninstall nodemailer @types/nodemailer
Then verify npm run dev still works. Check that no file in lib/ or app/ still imports from nodemailer.

---

## CODE #15 — vercel.json maxDuration: 60 does nothing on Hobby plan

**File:** `vercel.json`
**Category:** Code quality / misleading config
**Priority:** Low

**What the config does:**
vercel.json sets maxDuration: 60 on three routes. This is an attempt to allow those routes up to 60 seconds of execution time.

**Why it does nothing:**
Vercel Hobby plan has a hard cap of 10 seconds for serverless functions. maxDuration: 60 is only respected on Pro plan ($20/month) and above. On Hobby, functions are still killed at 10 seconds regardless of this config. The setting creates a false sense of security — a developer reading the config would think "these routes have 60 seconds" when they actually have 10.

**What the fix must do:**
Either:
- Remove the maxDuration lines from vercel.json (recommended — they do nothing)
- Or add a comment explaining they only apply on Pro plan

---

## CODE #16 — workflowEngine loads ALL workflows with no org isolation

**File:** `lib/engine/workflowEngine.ts`
**Category:** Code quality / data isolation bug
**Priority:** Medium — will become critical at scale

**What the code does now:**
When the workflow engine needs to find workflows for a trigger, it calls:
```ts
prisma.workflow.findMany()
```
With no `where` clause. This loads every workflow from every user in the database.

**Why this is a problem:**
1. Performance: As the user base grows, this query loads the entire workflows table on every trigger evaluation. With 1000 users and 5 workflows each, that's 5000 rows loaded on every cron tick, every webhook call, every WhatsApp message.
2. Data isolation: While the engine probably filters by workflowId or userId later, loading all records from all organisations into memory is a serious data isolation concern. A bug elsewhere could theoretically cause one user's payload to trigger another user's workflow.

**What the fix must do:**
When payload.userId is available, add a where clause:
```ts
prisma.workflow.findMany({
  where: { userId: payload.userId }
})
```
If the trigger is webhook-based and workflowId is known, query by ID directly:
```ts
prisma.workflow.findUnique({ where: { id: workflowId } })
```
Never load all workflows when a userId or workflowId is available.

---

## CODE #17 — interpolate() silently ignores unknown variables

**File:** `lib/utils/interpolate.ts`
**Category:** Code quality / debugging nightmare
**Priority:** Low-Medium

**What the code does now:**
The interpolate() function replaces {{variable}} placeholders in step configs with values from the workflow payload. If a variable name doesn't exist in the payload, the placeholder is replaced with an empty string "" and execution continues silently.

**Why this is a problem:**
If a user types {{custmer_email}} instead of {{customer_email}}, the typo is silently swallowed. The step receives an empty string and either does nothing, sends a blank email, or calls an API with an empty field. The user sees no error — the workflow shows as "completed" but the output is wrong or empty. Debugging this is extremely painful.

**What the fix must do:**
When a variable key is not found in the payload, log a warning:
```ts
console.warn(`[INTERPOLATE] Missing variable: "${key}" — replacing with empty string. Check your workflow step config.`);
```
Do NOT throw an error (that would break running workflows). Just warn loudly so it appears in Vercel/Railway logs.

---

## CODE #18 — supabase.ts is a legacy stub that confuses everyone

**File:** `lib/supabase.ts`
**Category:** Code quality / confusion
**Priority:** Low

**What exists:**
lib/supabase.ts is a leftover from an early version of the project. The database was never actually Supabase — it's always been Neon/PostgreSQL via Prisma. The file is an empty stub or has some placeholder code that does nothing.

**Why this is confusing:**
Any developer (or AI coding assistant) reading the project structure sees supabase.ts and reasonably assumes the project uses Supabase. This leads to incorrect assumptions about the auth model, database connection, and realtime features. It is actively misleading.

**What the fix must do:**
Either:
- Delete the file entirely (preferred)
- Or add a comment at the top: `// Legacy stub — not used. Database is Neon PostgreSQL accessed via Prisma. This file can be deleted.`

---

## INFRA #19 — Railway credits nearly empty

**Not a code fix — owner action required**
**Category:** Infrastructure
**Priority:** URGENT

Railway credits were at approximately $1.76 as of April 19 2026. At the current burn rate, the Railway worker service will go offline within ~2 weeks. When Railway credits hit zero, the worker process stops. The BullMQ queue will fill up with unprocessed jobs. All scheduled and webhook-triggered workflows will stop running silently. Users will see no errors in the UI — workflows just won't fire.

**Action required:**
Go to railway.app → Billing → Add a payment card. Railway charges only for actual usage, typically a few dollars per month for a small worker service.

---

## INFRA #20 — WAHA runs locally only — WhatsApp broken in production

**Category:** Infrastructure
**Priority:** Medium — decision pending from owner

WAHA (WhatsApp HTTP API) is the service that sends and receives WhatsApp messages. It is currently only running on the developer's local machine. The WAHA_URL environment variable points to localhost. In production on Vercel, every WhatsApp step fails because it tries to call localhost, which does not exist in the cloud.

**Options:**
1. **Deploy WAHA to Railway** — Add it as a second Railway service. Estimated cost: ~$5-10/month depending on usage. Update WAHA_URL to the Railway URL.
2. **Switch to a managed WhatsApp API** — Interakt, Wati, or 360dialog provide hosted WhatsApp Business APIs with proper infrastructure. Higher cost but no self-hosting.
3. **Deprioritise WhatsApp entirely** — Show a "coming soon" message on the WhatsApp page and focus on other features first.

Decision pending from owner.

---

## INFRA #21 — Emails land in spam

**Category:** Infrastructure
**Priority:** Medium — owner cannot fix immediately due to cost

All emails sent from AutoMax go out from onboarding@resend.dev — a shared Resend domain used by thousands of developers. Because this domain has no relationship with the recipient, and because it sends emails on behalf of many different applications, email providers (Gmail, Yahoo, Outlook) frequently classify it as spam or promotional.

**Root cause:**
Sending from a shared domain (resend.dev) means:
- No SPF record alignment with AutoMax's identity
- No DKIM signature proving ownership
- Domain reputation is shared across all Resend free-tier users

**Fix:**
1. Purchase a custom domain — e.g., automax.in or getautomax.com. Estimated cost: ~₹750/year via Cloudflare Registrar.
2. Add the domain to Resend account and verify DNS records (SPF + DKIM).
3. Update the `from` address in all email sending code to use the custom domain.

Owner has noted they cannot afford this currently. Until resolved, emails will continue landing in spam.