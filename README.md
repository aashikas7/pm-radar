# PM Radar v2
Deploy: push to GitHub -> import in Vercel (or `npx vercel`). No env vars needed.

Refresh: /api/jobs re-fetches all sources every 5 min (ISR, revalidate=300) and the page polls every 5 min.
vercel.json also runs a daily cron (Hobby plan allows once/day max).

Add sources: edit COMPANIES in lib/sources.js (Ashby / Lever / Greenhouse board names).
HR emails: shown only when the email is literally published in the job posting text. Nothing is guessed.
