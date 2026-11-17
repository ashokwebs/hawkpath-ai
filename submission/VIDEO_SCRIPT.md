# HawkPath: demo video kit (Google Vids)

**Raw recording:** `submission/hawkpath-demo-raw.mp4` (1920×1080, H.264, 1:52, no audio, real live API calls).
**Target length:** ~2:30 (limit is 3:00).
**Look:** white background, navy text (#0F172A), one blue accent (#1D4ED8), Inter font. Calm and professional, no neon.

---

## 1. Prompt to paste into Google Vids ("Help me create")

> Create a 2-minute-30-second product demo video for **HawkPath**, a web app that helps community college STEM students plan their transfer to a 4-year university. Style: clean, professional, light theme: white backgrounds, dark navy text, a single royal-blue accent (#1D4ED8), Inter or similar sans-serif, minimal motion, no stock footage of people, no neon colors.
>
> Structure:
> 1. **Title card (8s):** "HawkPath: know when you'll transfer, and what could change it." Subtitle: "Voice what-if planning for community college STEM students · CRC Hacks 2026".
> 2. **Problem card (8s):** "One failed prerequisite can delay a transfer by a full term or more. Working, first-generation students usually find out too late."
> 3. **Screen recording (main section, ~1:50):** I will upload my screen recording. Place it here full-screen and add short lower-third captions at the moments listed in my script.
> 4. **How it works card (8s):** "The AI explains. A verified planning engine does the math." Show three labeled steps: "Voice question → AI calls planning tools → exact answer + live plan update".
> 5. **Closing card (8s):** "HawkPath · Free for students. Colleges fund the scale." Show "hawkpath-ai.vercel.app" and "github.com/ashokwebs/hawkpath-ai".
>
> Use a calm, confident, friendly voiceover. Background music: soft, minimal, low volume.

---

## 2. Voiceover script (timed to the raw recording)

Paste each block as the voiceover for that clip, or read it yourself. Timings are positions **inside `hawkpath-demo-raw.mp4`**. Add the title and problem cards (~16s) before the recording starts.

**[Title card, ~8s]**
> Meet HawkPath: transfer planning for community college STEM students.

**[Problem card, ~8s]**
> At a community college, one failed prerequisite can quietly push your transfer back a full term. The students hit hardest are the ones working and studying on their own.

**[Recording 0:00–0:08 · Landing page]**
> HawkPath maps every prerequisite between you and a UC or CSU, and answers "what if" questions with exact dates.

**[0:08–0:14 · Real data section]**
> Every plan includes real outcome data from the U.S. Department of Education's College Scorecard.

**[0:14–0:19 · For colleges]**
> For colleges, the same engine rolls up into a counselor workspace. This part is an illustrative preview with example data.

**[0:19–0:26 · Pricing → open the planner]**
> It's free for students. Let's open the planner for a demo student, Ashok.

**[0:26–0:35 · Dashboard + hover CISP 400]**
> Ashok is projected to transfer to UC Davis in Spring 2028. The orange line is his critical path. Hover a course and you see everything it unlocks.

**[0:35–0:47 · Ask the what-if question]**
> Now the real question: "What if I fail CISP 400 and have to work 30 hours a week?" In about two seconds the advisor answers: transfer slips to Fall 2028, and the GPA drops below UC Davis's minimum. The graph redraws on its own.

**[0:47–0:53 · Tool-call trace]**
> The AI didn't guess any of this. It called our planning engine as tools, and every call is shown right here.

**[0:53–1:12 · Compare schools + table]**
> "Which school can I transfer to soonest, and what does it cost?" It compares every pathway, Sac State is fastest, and the table puts our projected dates next to live federal data on net price, graduation rate, debt and earnings.

**[1:12–1:19 · Slider]**
> The sliders run the same engine with no AI at all. Change your work hours and the plan updates instantly.

**[1:19–1:41 · Transcript import]**
> Students can upload a photo of their unofficial transcript. The AI reads every row in about four seconds, and each course is checked against the catalog. Here it correctly skips a P.E. class that doesn't count. One click builds a personal plan.

**[1:41–1:52 · Counselor report]**
> Finally, a counselor-ready report to bring to a MESA appointment, with the critical path and the full term-by-term plan.

**[How it works card, ~8s]**
> Under the hood: Groq and Gemini call our verified planning engine, with automatic failover, server-side keys and rate limits.

**[Closing card, ~8s]**
> HawkPath. Know when you'll transfer, and what could change it. Free for students.

---

## 3. Lower-third captions (optional, add in Vids)

| At (raw) | Caption |
|---|---|
| 0:09 | Live data · U.S. Dept. of Education College Scorecard |
| 0:15 | Illustrative preview · example data |
| 0:30 | Critical path = longest prerequisite chain |
| 0:42 | Live AI answer (Groq) · tools: simulate_what_if → show_scenario_on_dashboard |
| 0:48 | Every number comes from a tool call |
| 1:05 | Projected transfer + real cost & outcomes |
| 1:14 | No AI needed: same engine, instant |
| 1:28 | Transcript read by AI · validated against the catalog |
| 1:44 | Printable counselor report |

---

## 4. Editing steps in Google Vids

1. **New video → Help me create**, paste the prompt from section 1, and generate.
2. **Insert → Upload** `hawkpath-demo-raw.mp4` and place it after the problem card.
3. Optional: trim 1–2 seconds of idle time at 0:19–0:26 (scrolling back to the top) if you need room.
4. Add the voiceover: **Voiceover → Script**, paste each block from section 2, and pick a calm voice. Or record your own voice.
5. Add the captions from section 3.
6. Check the total is under **3:00**, then export as MP4 and upload to YouTube (Unlisted or Public). Paste the link into Devpost.

## Disclosures (required by the rules, already said in the voiceover)
- Demo students (Ashok, Maya, Marcus) and the sample transcript are fictional.
- The counselor workspace on the landing page is an illustrative preview with example data.
- Everything else in the recording uses live APIs: Groq and Gemini AI calls and College Scorecard data.
