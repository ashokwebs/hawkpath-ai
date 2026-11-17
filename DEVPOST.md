# Devpost submission kit: HawkPath AI

## Tagline
Ask "what if I fail this class?" out loud and get an exact answer. The AI talks; a real graph algorithm does the math.

## Inspiration
At a community college, one failed or dropped prerequisite can silently push a transfer back a term or more. The students most exposed are working, first-generation STEM students, and they usually find out too late, alone, between shifts. Generic AI chatbots don't help: they guess at prerequisites, and a confident wrong answer costs a semester.

## What it does
HawkPath turns a student's record into a live, semester-by-semester prerequisite graph with the critical path highlighted. Students can then ask "what if?" questions by voice or text:
- *"What happens if I fail CISP 400?"*
- *"Show me what 30 hours of work does to my plan."*
- *"Which school can I transfer to soonest?"*

A Gemini agent answers by calling deterministic tools: a topological scheduler, a critical-path solver, DAG reachability and a school comparer. It then speaks the exact result ("transfer slips from Spring 2028 to Fall 2028") and pushes the scenario onto the dashboard, which redraws live. Every tool call is visible on screen.

Students can also import an unofficial transcript photo or PDF (Gemini multimodal → structured JSON → catalog validation), save their plan with an account, and print a counselor-ready report for their MESA appointment.

## How we built it
- **Frontend:** React + TypeScript + Vite + Tailwind; custom SVG DAG renderer with animated transitions.
- **Voice:** Web Speech API for speech-to-text and SpeechSynthesis for replies. Zero extra cost, no extra service.
- **AI:** Google Gemini API (`@google/genai`, v1beta function calling) with a rotating pool of Flash/Flash-Lite models, so free-tier per-model quotas don't take the app down with a server-side function-calling loop (max 6 steps), image + PDF input and JSON-schema structured output for transcripts. Free tier friendly.
- **Real data:** U.S. Department of Education **College Scorecard API**: net price, graduation rate, median debt and earnings for every target school, shown next to the student's projected transfer date and callable by the agent (`get_school_outcomes`).
- **Engine:** the same TypeScript graph code runs in the browser (sliders, graph) and on the server (agent tools), so the AI's numbers and the UI's numbers can never disagree.
- **Auth/data:** Supabase Auth + Postgres row-level security; guests use local storage.
- **Hosting:** Vercel static site + serverless functions.

## Security & API handling
- API key is server-only (never bundled; verified), `.env` git-ignored, `.env.example` provided.
- Schema validation, clamping and size caps on every request; course codes checked against the catalog; allow-listed targets.
- Token-bucket rate limits (guest per IP, member per verified user) + a global daily budget, with `429 + Retry-After` and a UI countdown.
- SDK exponential-backoff retries, typed error handling, bounded agent loop, and a **graceful deterministic fallback** when the AI is unavailable.
- Identity only from a verified JWT; RLS on saved plans; security headers.

## Challenges
- Keeping the LLM honest: we moved all math into tools and made the system prompt require tool-sourced numbers. The UI shows the tool trace so anyone can audit an answer.
- Making AI actions visible: the `show_scenario_on_dashboard` tool returns a UI action, so a spoken question changes the graph.
- Transcript extraction can hallucinate. Structured output plus re-validation against the catalog drops anything not real.

## Accomplishments
- A voice question → tool calls → spoken answer → live graph redraw loop that works end to end.
- Answers stay correct even when the AI is down, because the engine runs locally.

## What we learned
Agentic AI is most trustworthy when the model orchestrates and explains while deterministic code computes.

## What's next
Live ASSIST.org articulation sync, more majors, Los Rios cross-campus seat search, and a counselor dashboard for MESA programs (the paid Campus tier; students stay free).

## Built with
google-gemini-api, college-scorecard-api, typescript, react, vite, tailwindcss, web-speech-api, supabase, postgresql, vercel, node.js

## Declared mocks / limitations (required by rules)
- Course catalog and articulation targets are a curated sample dataset, not a live ASSIST.org feed.
- Demo students (Ashok, Maya, Marcus) are fictional sample profiles.
- The "For colleges" counselor workspace on the landing page is an illustrative preview with example data (labelled in the UI); the student product and all school outcome numbers are live.
- Everything else in the demo (Gemini calls, tool execution, transcript reading, auth) is live.

---

# 3-minute demo video script

**0:00–0:20 · Hook (face or slide)**
"One failed class can quietly cost a community college student a year. HawkPath lets you ask *what if* out loud and get an exact answer, because the AI talks but a real graph algorithm does the math."

**0:20–0:50 · The dashboard**
Open `#/app` on Ashok (demo). Point at: projected transfer **Spring 2028**, the prerequisite graph with the orange animated critical path `CISP 300 → 360 → 400 → 430`, and the term-by-term plan. Hover CISP 400 to show its chain lighting up.

**0:50–1:40 · Voice what-if (the wow moment)**
Click the mic: *"What happens if I fail CISP 400 and have to work 30 hours a week?"*
- Show the reply being spoken.
- Expand **"deterministic tool calls"**: `simulate_what_if` → `show_scenario_on_dashboard`.
- The graph redraws: CISP 400 turns red (retake), the units cap at 10, and the transfer stat turns red: **Fall 2028, +1 term**. GPA drops below UC Davis's 3.4 minimum.
Say: "Gemini didn't guess any of that. It called our scheduler, and you can see every call."

**1:40–2:05 · Compare schools / sliders**
Ask: *"Which school can I transfer to soonest?"* (`compare_transfer_targets`). Then drag the work-hours slider to show the same engine re-planning instantly with no AI.

**1:55–2:05 · Real data**
Scroll to "Compare transfer options": live College Scorecard net price, grad rate, debt and earnings next to each projected transfer date. Ask: *"Is UC Davis or Sac State cheaper, and which pays off better?"* (`get_school_outcomes`).

**2:05–2:30 · Transcript import + report**
"Add my classes" → upload a transcript screenshot → courses fill in (mention catalog validation). Save → "Counselor report" → print preview.

**2:30–2:50 · Engineering & security (quick)**
Show `server/agent.ts` briefly: key server-only, validation, rate limit (show the 429 countdown if you can), graceful fallback. Mention Supabase RLS for saved plans.

**2:50–3:00 · Close**
"HawkPath: free for students, built for MESA. Know exactly when you'll transfer, and what could stop you."

### Recording tips
- Use Chrome (voice input needs the Web Speech API). Allow the microphone once beforehand.
- Do one warm-up question before recording so the first live call isn't the cold one.
- The free Gemini tier has small per-model limits (as low as 20 requests/day per model). The app rotates across several models, but each question uses 2–3 calls, so don't waste questions before recording. Wait ~20s between questions while recording. If you hit the limit, the app answers from the engine and shows "Graceful fallback" (a nice resilience demo, but not for your main take).
- For judging day, consider turning on billing for the Gemini key (Flash costs fractions of a cent per question). This raises the limits a lot.
