# Devpost submission: copy field by field

## Project name
HawkPath

## Elevator pitch (≤200 chars)
Ask "what if I fail this class?" out loud and see exactly how your transfer date changes. The AI explains; a verified planning engine and live federal data do the math.

## Thumbnail
`submission/devpost-gallery/00-devpost-thumbnail.png` (3:2)

## Image gallery (upload in this order)
1. `01-landing.png`: Landing page
2. `02-what-if-answer.png`: "Fail CISP 400 + 30h work": live AI answer, plan redraws
3. `03-tool-trace.png`: Every answer backed by visible tool calls
4. `04-compare-schools.png`: Projected transfer dates + live College Scorecard data
5. `05-transcript-import.png`: Transcript photo → courses in seconds
6. `06-counselor-report.png`: Counselor-ready report

## Links ("Try it out")
- https://hawkpath-ai.vercel.app
- https://github.com/ashokwebs/hawkpath-ai

## Video demo link
<your YouTube link>

## Built with
react, typescript, vite, tailwindcss, node.js, vercel, groq, gpt-oss, google-gemini, college-scorecard-api, web-speech-api, firebase, jose

---

## About the project (paste into the story editor)

## Inspiration
At a community college, STEM transfer runs on long prerequisite chains like CISP 300 → 360 → 400 → 430 and MATH 400 → 401 → 402. Fail or drop one link and the transfer can slip a full term or more. The students most exposed are working, first-generation students, the students CRC's MESA program serves. They usually find out too late, alone, between shifts. General AI chatbots don't help: they *guess* at prerequisites, and a confident wrong answer can cost a semester.

## What it does
HawkPath turns a student's record into a live, semester-by-semester prerequisite graph with the **critical path** highlighted. Then they can ask "what if?" by voice or text:

- *"What if I fail CISP 400 and have to work 30 hours a week?"* → transfer moves from Spring 2028 to **Fall 2028**, the GPA drops below UC Davis's 3.4 minimum, and the plan redraws itself.
- *"Which school can I transfer to soonest, and what does it cost?"* → it compares every pathway, with live U.S. Department of Education data on net price, graduation rate, debt and earnings.
- *"Why is CISP 430 such a big deal?"* → it shows the course's full prerequisite chain and which schools require it.

Students can also upload a photo or PDF of an unofficial transcript to build their plan in seconds, drag sliders for instant what-ifs with no AI involved, compare five transfer pathways side by side, and print a counselor-ready report for their MESA appointment.

## How we built it
- **The AI explains; the engine does the math.** The model never computes a schedule. It can only call five deterministic tools: `simulate_what_if` (topological term scheduler + critical-path DP), `get_course_dependencies` (DAG reachability), `compare_transfer_targets`, `get_school_outcomes` (College Scorecard) and `show_scenario_on_dashboard` (pushes the scenario to the UI, which redraws). The browser runs the same TypeScript engine, so the AI's numbers and the UI's numbers can't disagree.
- **AI providers:** Groq (`openai/gpt-oss-120b`, ~1–2s tool-calling answers) is primary, with per-model failover. Google Gemini is the automatic backup and also reads transcripts (image/PDF → JSON-schema output → every course validated against the catalog, so made-up rows are dropped).
- **Real-world data:** the U.S. Department of Education College Scorecard API (via api.data.gov), cached server-side for 24h and served stale if the API is down.
- **Voice:** Web Speech API for speech-to-text and SpeechSynthesis for spoken answers. No extra service or cost.
- **Stack:** React, TypeScript, Vite, Tailwind CSS; serverless functions on Vercel; custom SVG graph renderer with animated transitions.

## Security & API handling
- API keys live **only on the server** (never in the client bundle, which we verify by grepping the build). `.env` is git-ignored and `.env.example` is provided.
- Every request is schema-validated, size-capped and sanitized. Course codes are checked against the catalog and school IDs are allow-listed.
- Token-bucket rate limiting (per IP for guests, per verified user for members) plus a global daily budget, returning `429 + Retry-After` with a UI countdown.
- Bounded agent loop, per-request time budget, automatic model/provider failover, and a **graceful offline mode** that still answers from the engine if every AI provider is down.
- Security headers (`nosniff`, `X-Frame-Options: DENY`, microphone-only permissions policy). The server verifies identity from Firebase ID tokens, never from the request body.

## Challenges we ran into
- **Keeping the LLM honest.** Early answers added general claims the tools never returned. We moved every number into tools, enriched the tool outputs with real facts (critical path, which schools require a course), and added rules: state only tool facts, and never estimate a delay without running the simulator.
- **Free-tier limits in practice.** Gemini's free tier allowed only ~20 requests per model per day, and Groq limits tokens per minute. We built a provider chain (Groq → Gemini → offline engine) with per-model failover, cooldowns, `retryDelay` handling and smaller tool payloads, so it stays fast instead of failing.
- **Making AI actions visible.** A tool that returns a UI action lets a spoken question change the graph on screen.

## Accomplishments that we're proud of
- An end-to-end loop that works: question → tool calls → exact answer in ~2 seconds → live graph redraw.
- Answers stay correct even when every AI provider is down, because the engine runs on its own.
- Real federal outcome data next to each student's projected transfer date.

## What we learned
Agentic AI is most trustworthy when the model orchestrates and explains while deterministic code computes, and when users can see every step.

## What's next for HawkPath
Official catalog and ASSIST.org articulation sync, more majors and colleges, Los Rios cross-campus seat search when CRC sections are full, saved accounts across devices, and a counselor workspace for MESA programs and transfer centers (the paid Campus tier; students stay free).

## Technology & API ledger
| Type | What we used |
|---|---|
| AI (primary) | Groq API: `openai/gpt-oss-120b` (failover `gpt-oss-20b`, `qwen3.8-27b`), tool calling |
| AI (backup + vision) | Google Gemini API (`@google/genai`): function calling, image/PDF transcript reading, JSON-schema output |
| Public data API | U.S. Department of Education College Scorecard API (api.data.gov) |
| Browser APIs | Web Speech API (SpeechRecognition), SpeechSynthesis, FileReader |
| Auth (optional) | Firebase Authentication + Firestore with owner-only security rules; server token verification with `jose` |
| Frameworks | React 18, TypeScript, Vite 6, Tailwind CSS 3, lucide-react |
| Hosting | Vercel (static site + Node serverless functions) |

## Declared mocks / limitations
- The course catalog and articulation targets are a **curated sample** of the CRC STEM catalog, not a live ASSIST.org feed.
- Demo students (Ashok, Maya, Marcus) and the sample transcript are **fictional**.
- The "For colleges" counselor workspace on the landing page is an **illustrative preview with example data** (labelled in the UI).
- Accounts (Firebase) are being finished; the app runs fully in guest mode, with plans saved in the browser.
- Everything else in the demo is **live**: Groq and Gemini AI calls, transcript reading and College Scorecard data.
