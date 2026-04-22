# AutoMax AI Chat System — Full Architecture Documentation

> **For GitHub Copilot:** Read this entire file before writing a single line of code.
> Build in the exact order listed. One file at a time. Never skip a step.

---

## PROJECT CONTEXT

AutoMax is a Zapier-like workflow automation platform for Indian small businesses.
This document describes the complete AI chat assistant built into the platform.

- **AI Provider:** Groq only — model `llama-3.3-70b-versatile`
- **No Gemini. No OpenAI. No other providers.**
- **Stack:** Next.js App Router, TypeScript, Prisma, Upstash Redis, Tailwind (landing only)
- **Dashboard styling rule:** All dashboard pages use `style={{ }}` inline styles only — NO Tailwind classes
- **Design tokens:** background `#FAFAFA`, text `#1A1A2E`, accent `#F59E0B`, font: Inter

---

## ARCHITECTURE OVERVIEW — 6 LAYERS

Every user message passes through 6 layers in order.
If any layer blocks — the request stops there. No Groq call is made.

```
User Message
     │
     ▼
┌─────────────────────────────┐
│  LAYER 0 — Rate Limit Guard │  ← First. Always. Before everything.
└─────────────────────────────┘
     │ allowed
     ▼
┌─────────────────────────────┐
│  LAYER 1 — Session Memory   │  ← Lives in React useState only
└─────────────────────────────┘
     │ history trimmed
     ▼
┌─────────────────────────────┐
│  LAYER 2 — Account Context  │  ← Fetched once on page mount
└─────────────────────────────┘
     │ context string ready
     ▼
┌─────────────────────────────┐
│  LAYER 3 — Dynamic Context  │  ← Keyword match → DB fetch if needed
└─────────────────────────────┘
     │ relevant data ready
     ▼
┌─────────────────────────────┐
│  LAYER 4 — System Prompt    │  ← Assembled from layers 2 + 3
└─────────────────────────────┘
     │ prompt ready
     ▼
┌─────────────────────────────┐
│  LAYER 5 — Token Budget     │  ← Final check before Groq call
└─────────────────────────────┘
     │ safe to call
     ▼
   Groq API → reply → user
```

---

## LAYER 0 — Rate Limit Guard

### What it does
Counts how many AI requests the user has made today.
Blocks at 50. Resets at midnight. Costs zero tokens.

### Storage
- Provider: Upstash Redis (already in stack via `UPSTASH_REDIS_URL`)
- Key format: `ai:ratelimit:{userId}:{YYYY-MM-DD}`
- Value: integer (request count)
- TTL: 86400 seconds (24 hours — auto-expires, no cleanup needed)

### Logic
```
1. Get current count from Redis for today's key
2. If count >= 50 → return error message immediately (no Groq call)
3. If count < 50 → increment count → proceed to next layer
4. If Redis is DOWN → fail open (allow request, never block user for infra failure)
```

### Error message to return when limit hit
```
"You've used your 50 daily AI messages. Resets at midnight."
```

### Response shape when rate limited
```typescript
{ error: "rate_limited", message: "You've used your 50 daily AI messages. Resets at midnight." }
// HTTP status: 429
```

### Notes
- This runs BEFORE any Prisma query or Groq call
- A blocked request costs zero money
- Fail open = if Redis throws any error, allow the request through

---

## LAYER 1 — Session Memory

### What it does
Holds the conversation history for the current browser session.
No database. No persistence. Tab closes = history gone.

### Storage
- React `useState` on the frontend only
- `messages` array: `{ role: "user" | "assistant", content: string }[]`

### Rules
- Every request from the frontend sends the full `messages` array to the API
- The backend is completely stateless — it does not read or write conversation to DB
- Hard cap: last **20 messages** sent to Groq maximum
- If array length > 20 → drop oldest messages, keep newest 20
- This trimming happens in `trimHistory()` inside `contextBuilder.ts`

### Why no DB persistence
- Zero DB cost
- Zero complexity
- Users at this scale don't need cross-session memory
- Can be added later when there is budget

---

## LAYER 2 — Account Context

### What it does
Gives Groq a snapshot of who the user is and what workflows they have.
Fetched once on AI page mount. Never re-fetched mid-conversation.

### When it's fetched
- Once when `app/(dashboard)/dashboard/ai/page.tsx` mounts
- Stored in React `useState` for the entire session
- Sent with every API request in the request body

### DB Query (one Prisma query)
Fetch:
- User name
- Organization name (if the user belongs to one)
- All active workflow names + trigger types
- Total workflow runs this week
- Success count this week
- Failure count this week

### Output format (compact string, ~60 tokens)
```
User: {name} | Org: {orgName or "none"}
Active Workflows ({count}):
- "{workflowName}" ({triggerType}) — {runsThisWeek} runs this week, {failCount} failed
Week total: {totalRuns} runs | {successCount} success | {failCount} failed
```

### Example output
```
User: Logeshwaran | Org: none
Active Workflows (3):
- "Lead Follow-up" (webhook) — 12 runs this week, 2 failed
- "Monthly Offer" (schedule) — 4 runs, 0 failed
- "New Order Alert" (whatsapp) — 8 runs, 1 failed
Week total: 24 runs | 21 success | 3 failed
```

### Notes
- If user has no workflows → write "No active workflows."
- If user has no org → write "Org: none"
- Keep it compact. Target under 80 tokens always.

---

## LAYER 3 — Dynamic Context

### What it does
Detects what the user is asking about and fetches relevant run data from DB.
Only fetches when the question actually needs it. Most questions fetch nothing.

### Fuzzy Keyword Matching
**Package:** `fastest-levenshtein` (free npm package, zero token cost, runs on server)
**Install command:** `npm install fastest-levenshtein`

**Why fuzzy matching:**
Users are Indian small business owners typing on mobile with frequent typos.
`includes()` alone misses "faild", "errror", "whatsap", "didnt".
Levenshtein distance ≤ 2 catches all single and double character typos automatically.

**How it works:**
Split the user message into individual words.
For each word, check its Levenshtein distance against every keyword in the list.
If any word is within distance ≤ 2 of a keyword → that intent is triggered.

### Intent Detection Table

| Intent | Keywords (fuzzy matched, distance ≤ 2) | Data fetched |
|---|---|---|
| failure_query | failed, faild, error, eror, not working, not workng, didn't run, didnt run, didn't send, didnt send, not received, not recieved, missed, not sent, wasnt sent, didn't get, didnt get, no message, no whatsapp, whatsapp failed, whatsap failed | Last **10** failed runs with step errors |
| workflow_query | Any active workflow name from user's account (fuzzy matched) | That workflow's last 10 runs |
| time_query | today, this hour, right now, just now, recent, latest | Runs from last 60 minutes |
| payload_query | Any 10-digit phone number, or a person's name if found in payload | Search run payloads for that value |
| build_query | create, build, suggest, how do i, how to, make, setup, set up | Nothing fetched |
| default | Anything else | Nothing fetched |

### Why 10 runs (not 5)
Original design used 5. Changed to 10 for failure queries.
Real scenario: workflow runs 10 times a day, 2 failures — failure #1 happened at 9AM, failure #2 at 1PM.
With cap of 5, only the most recent 5 runs are fetched — early failures are invisible to Groq.
With cap of 10, both failures are visible. Groq gives a correct answer.
10 failed run summaries = ~300 tokens. Still well inside budget.

### Run Summary Format (never raw JSON)
Each run is summarized to key fields only before sending to Groq:
```
Run #{index}: {status} | Workflow: {workflowName} | Time: {startedAt}
Trigger: {trigger} | Steps: {stepCount}
{if failed}: Failed at step {stepIndex} ({stepType}): {errorMessage or "error details unavailable"}
{if payload has phone/name}: Contact: {phone or name}
```

### Edge Cases
- Payload missing name/phone → skip gracefully, don't crash
- Run has no step errors → write "error details unavailable"
- Workflow name partial match → lowercase includes + fuzzy check
- No runs found → write "No runs found for this query"
- Multiple workflows match fuzzy → fetch last 10 runs for each match, combine (max 10 total)

### Output
Returns a compact string injected into Layer 4 system prompt.
If nothing fetched → returns the string `"None"`

---

## LAYER 4 — Groq System Prompt

### What it does
Assembles the complete system prompt from all context layers.
Sent to Groq on every call. Hard limit: 400 tokens total for this block.

### Prompt Template
```
You are AutoMax Assistant — a workflow automation helper for Indian small businesses.

PLATFORM CAPABILITIES:
Triggers: webhook, schedule (cron), manual, WhatsApp incoming
Steps: send email, send WhatsApp, AI decision, Google Sheets read/append, condition

ACCOUNT CONTEXT:
{Layer 2 output}

RELEVANT DATA FOR THIS QUERY:
{Layer 3 output — "None" if not applicable}

RULES:
- You are read-only. Never claim you can execute or modify workflows.
- Never guess run data. If you don't have it, say: check the Runs page.
- Never expose or reference other users' data.
- For workflow suggestions always output: Trigger → Step 1 → Step 2 → ... format.
- Answer in simple English. Users are Indian small business owners, not developers.
- If asked to build a workflow, describe the layout then ask: "Want me to generate a template for this?"
- If you cannot determine the answer from the data provided, say: "I don't have enough data for this — check the Runs page for full logs."
```

### Notes
- Never exceed 400 tokens for this block
- Layer 2 is ~60-80 tokens
- Layer 3 is ~150-300 tokens when triggered
- Rules block is ~120 tokens
- If dynamic context is large, trim run summaries first to stay under 400

---

## LAYER 5 — Token Budget Guard

### What it does
Final check before the Groq call. Ensures total token usage stays safe.

### Token Budget Per Call
```
System prompt (Layer 4):   ~300 tokens
Account context (Layer 2):  ~60 tokens
Dynamic context (Layer 3):  ~150 tokens (when triggered, else 0)
Conversation history:       ~500 tokens (20 messages × ~25 tokens avg)
Current user message:        ~50 tokens
─────────────────────────────────────────
Worst case total:          ~1,060 tokens
```

Groq free tier: 6,000 TPM. Worst case is 1,060 per call. Very safe.

### Enforcement Rules
1. Trim history to last 20 messages using `trimHistory()` — always
2. Cap dynamic context at 10 run summaries max — always
3. Summarize run payloads to key fields — never dump raw JSON
4. If system prompt exceeds 400 tokens — trim run summaries first, then capability list

---

## GROQ LIMITS (Free Tier — April 2026)

| Limit | Value |
|---|---|
| Tokens per minute | 6,000 |
| Requests per minute | 30 |
| Requests per day | 1,000 |
| Tokens per day | 500,000 |

At 50 requests/user/day × ~1,060 tokens = ~53,000 tokens/user/day
Safe daily user ceiling on free tier = ~9 heavy users on one API key
**RPD of 1,000/day is the real binding constraint — not TPM**

---

## FILES TO BUILD — IN ORDER

> **Copilot instruction: Build exactly one file at a time in this order.
> Do not start File 2 until File 1 is confirmed working.
> Never combine files.**

---

### FILE 1 — `lib/ai/aiClient.ts`

**Purpose:** Clean Groq-only API client. Removes all Gemini code.

**Exports:**
```typescript
export async function callGroq(
  messages: { role: "user" | "assistant" | "system"; content: string }[],
  systemPrompt: string
): Promise<string>
```

**Behaviour:**
- Uses `groq-sdk` (already installed)
- Model: `llama-3.3-70b-versatile`
- Max tokens: 1000
- On 429 (rate limit): return string `"Groq rate limit reached. Please try again in a moment."`
- On any other error: return string `"AI is temporarily unavailable. Please try again."`
- Never throw. Always return a string.
- No Gemini imports. No fallback providers.

**Environment variable used:** `GROQ_API_KEY`

---

### FILE 2 — `lib/ai/contextBuilder.ts` (NEW FILE)

**Purpose:** Builds all context strings and trims history. Three exported functions.

**Install before building:** `npm install fastest-levenshtein`

#### Export 1: `buildAccountContext`
```typescript
export async function buildAccountContext(userId: string): Promise<string>
```
- One Prisma query
- Fetches: user name, org name, active workflow names + trigger types, run counts for this week
- Returns compact string as described in Layer 2 above
- If Prisma throws → return `"Account context unavailable."`

#### Export 2: `buildDynamicContext`
```typescript
export async function buildDynamicContext(
  userId: string,
  message: string,
  workflows: { id: string; name: string }[]
): Promise<string>
```
- Uses `fastest-levenshtein` for fuzzy keyword matching (distance ≤ 2)
- Detects intent from message using the Intent Detection Table in Layer 3
- Fetches relevant run data from Prisma based on detected intent
- Summarizes each run into compact string format (never raw JSON)
- Returns compact string or `"None"` if no intent matched
- If Prisma throws → return `"None"` (fail gracefully)

**Fuzzy match helper (write inside this file, not exported):**
```typescript
function fuzzyMatchesAny(word: string, keywords: string[]): boolean {
  // Use fastest-levenshtein distance()
  // Return true if any keyword has distance <= 2 from word
}

function messageMatchesIntent(message: string, keywords: string[]): boolean {
  // Split message into words
  // For each word, call fuzzyMatchesAny
  // Return true if any word matches
}
```

#### Export 3: `trimHistory`
```typescript
export function trimHistory(
  messages: { role: string; content: string }[]
): { role: string; content: string }[]
```
- If messages.length <= 20 → return as-is
- If messages.length > 20 → return last 20 messages only
- Always keep newest messages, drop oldest

---

### FILE 3 — `app/api/ai/route.ts`

**Purpose:** Full API route with all 6 layers wired together.

**Method:** POST only

**Request body shape:**
```typescript
{
  message: string,              // current user message
  messages: { role: string; content: string }[],  // full history
  accountContext: string        // pre-fetched from frontend on mount
}
```

**Response body shape (success):**
```typescript
{
  reply: string,
  requestsUsed: number,
  requestsRemaining: number
}
```

**Response body shape (rate limited):**
```typescript
// HTTP 429
{
  error: "rate_limited",
  message: "You've used your 50 daily AI messages. Resets at midnight.",
  requestsUsed: 50,
  requestsRemaining: 0
}
```

**Response body shape (any other error):**
```typescript
// HTTP 200 always — never return raw 500
{
  reply: "AI is temporarily unavailable. Please try again.",
  requestsUsed: number,
  requestsRemaining: number
}
```

**Execution order inside the route:**
```
1. Verify JWT from "auth-token" cookie → get userId
2. LAYER 0: Check Redis rate limit
   - Get key: ai:ratelimit:{userId}:{YYYY-MM-DD}
   - If count >= 50 → return 429 immediately
   - If Redis down → log error, proceed (fail open)
3. Parse request body → extract message, messages, accountContext
4. LAYER 3: Call buildDynamicContext(userId, message, workflows)
   - workflows list comes from accountContext parse OR a small Prisma query
5. LAYER 4: Assemble system prompt string
6. LAYER 5: Call trimHistory(messages)
7. Call callGroq(trimmedMessages, systemPrompt)
8. Increment Redis counter (INCR + EXPIRE 86400)
9. Return { reply, requestsUsed, requestsRemaining }
```

**Critical rules:**
- Never return HTTP 500 under any condition
- Always return a friendly string even if Groq fails
- Rate limit check is always FIRST — before any DB query
- Use `NextRequest` and `NextResponse`
- Await `context.params` (Next.js 15+ requirement)

---

### FILE 4 — `app/(dashboard)/dashboard/ai/page.tsx`

**Purpose:** The AI chat UI page. Full rebuild.

**Styling rules:**
- Use `style={{ }}` inline styles only — NO Tailwind classes
- Background: `#FAFAFA`
- Text: `#1A1A2E`
- Accent / send button: `#F59E0B`
- Font: Inter
- Mobile responsive — this page is used on phone

---

#### UI LAYOUT DESCRIPTION

```
┌─────────────────────────────────────────────┐
│  HEADER BAR                                 │
│  "AutoMax AI Assistant"          [icon]     │
│  "42 of 50 messages remaining today"        │
└─────────────────────────────────────────────┘
│                                             │
│  CHAT AREA (scrollable, flex-col)           │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🤖 Assistant bubble (left aligned)  │   │
│  │ bg: #F0F0F0, rounded, padding 12px  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│        ┌───────────────────────────────┐   │
│        │ 👤 User bubble (right aligned) │   │
│        │ bg: #F59E0B, text: white       │   │
│        └───────────────────────────────┘   │
│                                             │
│  [loading indicator — 3 animated dots      │
│   shown while waiting for Groq response]   │
│                                             │
└─────────────────────────────────────────────┘
│  INPUT BAR (sticky bottom)                  │
│  ┌──────────────────────────────┐ [Send ▶] │
│  │ Type your message...         │           │
│  └──────────────────────────────┘           │
│  Input border: #E5E5E5, focus: #F59E0B      │
└─────────────────────────────────────────────┘
```

#### Welcome Message
When chat is empty (no messages yet), show this centered in the chat area:
```
🤖
"Hi! I'm your AutoMax assistant.
Ask me about your workflows, runs, or
how to automate your business."
```

#### Rate Limit Banner
When limit is hit (requestsRemaining === 0), show a banner above input bar:
```
┌─────────────────────────────────────────────┐
│ ⚠️ You've used all 50 messages for today.   │
│    Resets at midnight.                      │
└─────────────────────────────────────────────┘
bg: #FEF3C7, border: #F59E0B, text: #92400E
Input and send button disabled when banner shows.
```

---

#### State Management
```typescript
const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
const [accountContext, setAccountContext] = useState<string>("")
const [input, setInput] = useState<string>("")
const [loading, setLoading] = useState<boolean>(false)
const [requestsUsed, setRequestsUsed] = useState<number>(0)
const [requestsRemaining, setRequestsRemaining] = useState<number>(50)
const [cooldown, setCooldown] = useState<boolean>(false)
```

#### On Mount (useEffect)
```
1. Call GET /api/ai/context → returns { accountContext, requestsUsed, requestsRemaining }
2. Set accountContext in state
3. Set requestsUsed and requestsRemaining in state
```
> This requires a small GET endpoint at `/api/ai/context` — see below.

#### Send Button Behaviour
- Disabled when: `loading === true` OR `cooldown === true` OR `requestsRemaining === 0` OR `input.trim() === ""`
- On click:
  1. Append user message to `messages` state
  2. Clear input
  3. Set `loading = true`
  4. POST to `/api/ai` with `{ message, messages, accountContext }`
  5. On response: append assistant reply to `messages`
  6. Update `requestsUsed` and `requestsRemaining` from response
  7. Set `loading = false`
  8. Set `cooldown = true` → after 3 seconds set `cooldown = false`
- Auto-scroll chat area to bottom after every new message

#### Loading Indicator
While `loading === true`, show three animated dots in the assistant bubble position:
```
● ● ●  (pulsing animation, color #1A1A2E)
```

---

### EXTRA FILE — `app/api/ai/context/route.ts`

**Purpose:** GET endpoint called on AI page mount.
Returns account context string + today's usage count.

**Method:** GET

**Response:**
```typescript
{
  accountContext: string,
  requestsUsed: number,
  requestsRemaining: number
}
```

**Logic:**
1. Verify JWT from `auth-token` cookie → get userId
2. Call `buildAccountContext(userId)` from contextBuilder
3. Get today's Redis key `ai:ratelimit:{userId}:{YYYY-MM-DD}` → get count
4. Return `{ accountContext, requestsUsed: count, requestsRemaining: 50 - count }`
5. If Redis down → return `requestsUsed: 0, requestsRemaining: 50` (fail open)

---

## ENVIRONMENT VARIABLES NEEDED

All already exist in `.env`. No new variables needed.

| Variable | Used in |
|---|---|
| `GROQ_API_KEY` | `lib/ai/aiClient.ts` |
| `UPSTASH_REDIS_URL` | `app/api/ai/route.ts` + context route |
| `DATABASE_URL` | Prisma in `contextBuilder.ts` |
| `JWT_SECRET` | Auth verification in routes |

---

## NPM PACKAGE TO INSTALL

Only one new package needed:

```bash
npm install fastest-levenshtein
```

No other new packages. Everything else is already installed.

---

## BUILD VERIFICATION CHECKLIST

After each file, verify before moving to the next.

### After File 1 (aiClient.ts)
- [ ] Groq returns a real response for a test message
- [ ] No Gemini imports anywhere in the file
- [ ] 429 from Groq returns friendly string, does not throw
- [ ] Any other Groq error returns friendly string, does not throw

### After File 2 (contextBuilder.ts)
- [ ] `buildAccountContext` returns correct compact string for a real user
- [ ] `buildDynamicContext` returns "None" for "how do I create a workflow"
- [ ] `buildDynamicContext` returns failed run data for "my workflow faild" (typo test)
- [ ] `trimHistory` returns same array when length ≤ 20
- [ ] `trimHistory` returns last 20 when given 25 messages

### After File 3 (api/ai/route.ts)
- [ ] 51st request returns 429 with correct message
- [ ] Redis key exists after first request with correct TTL
- [ ] Response always includes `requestsUsed` and `requestsRemaining`
- [ ] No raw 500 returned under any condition — test by temporarily breaking Groq key

### After File 4 (ai/page.tsx)
- [ ] Account context loads on mount
- [ ] Remaining count shows correctly ("42 of 50 remaining today")
- [ ] Full message history sends with every request
- [ ] Input disables when limit is hit
- [ ] Send button has 3-second cooldown after each response
- [ ] Chat auto-scrolls to bottom after each message

---

## CRITICAL RULES FOR COPILOT — NEVER BREAK

1. Build one file at a time. Never combine files in one response.
2. Use `@/` import alias in all Next.js app files
3. Use relative imports in worker files only
4. Always use `NextRequest` and `NextResponse` in API routes
5. Always `await context.params` in dynamic API routes (Next.js 15+)
6. Cookie name is `auth-token` everywhere — never change
7. Dashboard pages use `style={{ }}` inline only — no Tailwind classes
8. Never return HTTP 500 from any API route — always return friendly error
9. Rate limit check is ALWAYS first in the AI route — before any DB or Groq call
10. Never dump raw JSON run payloads to Groq — always summarize
11. After saving any `.ts` file — run `node fix-bom.js` on that file
12. Never run `npm audit fix --force`
13. Never touch `zod` version — it is locked at `^3.25.76`
14. Prisma reads from `.env` not `.env.local` — never move `DATABASE_URL`
15. AI system is read-only — Groq cannot trigger or modify workflows

---

## WHAT NOT TO BUILD

- ❌ No conversation history saved to database
- ❌ No cross-session memory
- ❌ No Gemini or any other AI provider
- ❌ No embeddings or vector search
- ❌ No workflow execution from chat (read-only only)
- ❌ No shared quota across users (per-user limit only)
- ❌ No hybrid summarization for session memory (rejected — causes double API calls)
- ❌ No new Prisma schema changes — Conversation table stays untouched

---

*End of AutoMax AI Chat System Architecture Document*
*Version: Final | Reviewed and approved by Logeshwaran P*
