# 🦅 HawkPath AI

**A voice-first transfer planner for community college STEM students. The AI talks; a real graph algorithm does the math.**

Ask out loud *"What if I fail CISP 400 and pick up 30 hours of work?"* and HawkPath re-runs your prerequisite graph, tells you the exact transfer delay, and redraws your semester plan on screen, live.

Built for **CRC Hacks 2026** at Cosumnes River College.

---

## The problem

STEM transfer runs on long prerequisite chains (`CISP 300 → 360 → 400 → 430`, `MATH 400 → 401 → 402`). One failed or dropped class can quietly push a transfer back a full term or more. The students most exposed are working and first-generation students (the people CRC's MESA program serves), who usually make these decisions alone, at night, between shifts, long before a counselor appointment opens up.

Generic AI chatbots make this worse: they *guess* at prerequisites and schedules, and a confident wrong answer costs a semester.

## What HawkPath does

| | |
|---|---|
| 🎙️ **Voice advisor** | Hands-free questions and spoken answers (Web Speech API in, `speechSynthesis` out). |
| 🧠 **Tool-calling AI agent (Groq + Gemini)** | The model never computes a plan. It can only call 4 deterministic tools and must speak the numbers they return. Every tool call is shown in the UI. |
| 🔀 **What-if simulator** | Fail a class, change work hours or unit load, switch target school. Re-plans instantly and shows the delay in terms. |
| 🕸️ **Prerequisite DAG** | Semester-layered graph with an animated critical path. Hover to trace everything a course needs and unlocks. |
| 📄 **Transcript import** | Upload a photo or PDF of an unofficial transcript. Gemini multimodal input + JSON-schema structured output extracts rows, then **every course is re-validated against the catalog**, so hallucinated codes are dropped. |
| 🏛️ **Real outcome data** | Live **U.S. Department of Education College Scorecard** figures for every target school (net price, graduation rate, median debt, earnings 10 years after entry, Pell share), shown next to the student's projected transfer date and available to the AI as a tool. |
| 🖨️ **Counselor-ready report** | One click to a printable plan for a MESA or transfer counselor appointment. |
| 👤 **Accounts (optional)** | Supabase Auth (email + password, magic link, password reset). Saved plans are protected by Postgres row-level security. Guests keep their plan in the browser. |

## Architecture

```
Browser (React + Vite + Tailwind)
 ├─ Web Speech API  ──► text question
 ├─ Same DAG engine runs client-side for sliders / graph (src/utils)
 └─ POST /api/advisor  (+ Supabase JWT if signed in)
        │
Server (Vite middleware in dev / Vercel functions in prod)  server/
 ├─ verify JWT (Supabase) → member or guest tier
 ├─ token-bucket rate limit + global daily budget
 ├─ schema validation, size caps, control-char stripping, allow-listed targets
 └─ AI agent loop (max 6 steps): Groq gpt-oss-120b → Gemini Flash failover → offline engine
       tools ──► simulate_what_if          (topological scheduler + critical-path DP)
             ──► get_course_dependencies   (DAG reachability up/down)
             ──► compare_transfer_targets  (runs every school)
             ──► get_school_outcomes       (College Scorecard API, cached 24h)
             ──► show_scenario_on_dashboard (returns a UI action → graph redraws)
       on failure ──► retry w/ backoff (SDK) ──► graceful deterministic fallback
```

**Why it can't hallucinate your schedule:** the scheduler, critical path and reachability code in `src/utils/` is the *same code* the dashboard draws from and the agent calls as tools. The model only chooses which tool to call and phrases the result.

### Algorithms (`src/utils/graphAlgorithms.ts`, `src/utils/scenario.ts`)
- **Critical path:** memoised longest-path DP over the prerequisite DAG, O(V+E).
- **Scheduler:** term-by-term topological release (Kahn-style). A course becomes eligible only when all prerequisites are satisfied in *earlier* terms. Priority goes to critical-path courses, then fan-out degree. Respects terms offered and a workload-aware unit cap (≥25 h/week → 12 units, ≥30 h → 10).
- **Reachability:** iterative DFS for full upstream chains / downstream unlocks.

## Security & reliability

- 🔑 `GROQ_API_KEY` and `GEMINI_API_KEY` exist **only on the server** (not `VITE_`-prefixed, so it is never bundled; verified by grepping `dist/`). No keys in the repo; `.env` is git-ignored; `.env.example` documents config.
- 🧱 Input validation: profile/scenario/messages are schema-checked, clamped and size-capped (64 KB body, 1,500-char messages, 16-turn history); course codes are normalised and checked against the catalog; target ids are allow-listed.
- 🚦 Rate limiting: per-IP token bucket for guests, per-user bucket (verified JWT) for members, plus a global daily request budget. Returns `429` + `Retry-After`; the UI shows a countdown.
- 🔁 Resilience: 429/5xx retried with exponential backoff + jitter; bounded agent loop; typed `ApiError` status handling, per-model circuit breaker + automatic failover when a model is overloaded (503), rate-limited (429, honours Google's `retryDelay`) or unavailable (404). If the AI is down, the deterministic engine still answers (UI shows *"Graceful fallback"*).
- 🛡️ Identity is taken only from a verified Supabase JWT, never from a request body. Saved plans use RLS (`supabase/schema.sql`).
- 🧾 Security headers (`nosniff`, `X-Frame-Options: DENY`, mic-only `Permissions-Policy`), `Cache-Control: no-store` on API responses. The chat renderer never injects HTML.

## Tech & API ledger

| Kind | What |
|---|---|
| AI (primary) | **Groq API** (`groq-sdk`): `openai/gpt-oss-120b` with tool calling, ~2s answers, failover to `gpt-oss-20b` / `qwen3.8-27b` |
| AI (backup + vision) | **Google Gemini API** via `@google/genai`: a rotating pool of fast Flash / Flash-Lite models (`gemini-3.5-flash-lite` first) so free-tier daily quotas are spread across models, plus newer Flash models discovered via the models API (override with `GEMINI_MODEL`); function calling, image/PDF input, JSON-schema structured output. Free tier compatible. |
| Public data API | **College Scorecard API** (U.S. Dept. of Education, via api.data.gov): school outcomes, server-side, cached 24h, stale-on-error |
| Browser APIs | **Web Speech API** (`SpeechRecognition`) for voice input, **SpeechSynthesis** for spoken replies, FileReader |
| Auth / DB | **Supabase** Auth + Postgres with row-level security (`@supabase/supabase-js`), optional |
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS 3, lucide-react |
| Hosting | Vercel (static site + Node serverless functions in `api/`) |

**Data note:** course and articulation data is a curated sample of the CRC STEM catalog and common UC/CSU CS targets, built for this prototype. It is not live ASSIST.org data. HawkPath is a planning aid, not an official degree audit.

## Run locally

```bash
npm install
cp .env.example .env        # add GROQ_API_KEY and GEMINI_API_KEY (Supabase vars optional)
npm run dev                 # http://localhost:5173
```

With no key set, the app still works in **offline mode** (deterministic answers, clearly labelled).

### Optional: accounts
1. Create a free Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Put the project URL and anon key in `.env` as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
4. In Supabase → Auth → URL configuration, add your site URL.

### Deploy (Vercel)
1. Push to GitHub, then import the repo in Vercel (framework: Vite).
2. Add `GROQ_API_KEY`, `GEMINI_API_KEY` (and the Supabase vars if used) under Environment Variables.
3. Deploy. `api/advisor.ts` and `api/transcript.ts` become serverless functions.

## Data honesty
- School outcome numbers are real and live (College Scorecard).
- The **counselor workspace on the landing page is an illustrative preview with example data**, and it is labelled as such in the UI.
- Demo students (Ashok, Maya, Marcus) are fictional sample profiles.

## Business model

Free for students, always. Revenue comes from **Campus / MESA program licences** (counselor dashboard across student plans, cohort bottleneck analytics, SSO, official catalog + ASSIST sync) and an optional **Student Plus** tier. Running cost per conversation is small and capped by the daily budget and rate limits.

## Roadmap
- Live catalog + ASSIST.org articulation sync, more majors
- Los Rios cross-campus section availability (ARC / SCC / FLC) when CRC sections are full
- Counselor dashboard and shared plans
- Streaming voice responses for lower latency

## Honest limitations
- Course/articulation data is a curated sample, not an official live feed.
- Voice input requires Chrome or Edge (Web Speech API); text works everywhere.
- Rate limits are per server instance (swap the in-memory map for Redis to share across instances).
