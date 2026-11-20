# PM Radar v2 (GitHub Pages)

Static Next.js export hosted on GitHub Pages at https://aashikas7.github.io/pm-radar/.

How it works: GitHub Pages is static-only, so there is no server API. A build-time
script (scripts/snapshot.mjs) runs the same source scan (lib/sources.mjs) and bakes
the results into public/data/jobs.json, which the page reads client-side.
All filtering, search, sort and resume-fit run in the browser.

Refresh: .github/workflows/deploy.yml rebuilds and redeploys hourly (cron "23 * * * *"),
plus on every push to main and manually via Actions -> Build and deploy -> Run workflow.
The "Last scan" timestamp in the header is when the data was last built.

Deploy: repo Settings -> Pages -> Source = GitHub Actions (one time). No env vars needed.

Add sources: edit COMPANIES in lib/sources.mjs (Ashby / Lever / Greenhouse board names).
HR emails: shown only when the email is literally published in the job posting text. Nothing is guessed.
