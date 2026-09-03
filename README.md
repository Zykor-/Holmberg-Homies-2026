# Holmberg Homies 2026

A mobile-friendly friends pickleball tournament and potluck site for Holmberg Park in Spokane. It supports player registration, the Cream of the Crop rotating-partner format, a shared potluck list, an individual qualifying leaderboard, a championship matchup, and a ready-to-activate T-shirt order section.

## Stack

- React + TypeScript on Vinext
- Cloudflare Worker route handlers for secure Airtable access
- Airtable as the source of truth
- Cloudflare static assets + Workers for free hosting
- GitHub Actions for automatic deployment from `main`

The browser never receives the Airtable token. All Airtable reads and writes go through same-origin serverless endpoints under `/api`.

## Airtable schema

The app expects these tables and exact field names:

| Table | Fields |
| --- | --- |
| Players | Player ID, Name, Contact, Registration Date, Active |
| Matches | Match ID, Round, Team 1, Team 2, Team 1 Score, Team 2 Score, Completed, Match Type |
| Potluck | Contribution ID, Player, Item, Updated At |

The existing Votes table and its historical records are intentionally left intact in Airtable, but the public site no longer reads or writes voting data. `Match Type` accepts `Round Robin` or `Finals`.

The public standings framework is individual-player based and sorts by wins, then point differential. Detailed rotating-partner score entry will be connected after the final player count and pairing logic are decided. The championship display uses the #1 + #4 vs. #2 + #3 pairing and is labeled Best of 3.

## Environment variables

Copy `.dev.vars.example` to `.dev.vars` for local development and set:

```text
AIRTABLE_TOKEN=your_personal_access_token
AIRTABLE_BASE_ID=appvpjuRNIdjXagB0
AIRTABLE_PLAYERS_TABLE_ID=tblefvH7wtYbgPIU0
AIRTABLE_MATCHES_TABLE_ID=tblfZs2qudo25ngxE
AIRTABLE_POTLUCK_TABLE_ID=tblkPVM8axmyPszi1
```

Create a narrowly scoped Airtable personal access token with record read/write access only to the tournament base. Keep the token out of GitHub and add it as a secret in the hosting dashboard.

## Local development

Requirements: Node.js 22 or newer.

```bash
npm ci
cp .dev.vars.example .dev.vars
npm run dev
```

## Cloudflare deployment

This full-stack build targets Cloudflare Workers with static assets because registration and potluck updates require secure server-side functions. It deploys to a free `workers.dev` address; no custom domain is required.

For automatic GitHub deployment:

1. Push this project to a GitHub repository with `main` as the default branch.
2. Add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. In Cloudflare, add `AIRTABLE_TOKEN` as an encrypted Worker secret. The non-secret base and table values are already configured in `wrangler.jsonc`.
4. Push to `main`. `.github/workflows/deploy.yml` builds and deploys the site.

For a manual first deployment:

```bash
npm run build
npx wrangler secret put AIRTABLE_TOKEN
npx wrangler deploy
```

The non-secret Airtable configuration values are already included in `wrangler.jsonc`.

## Updating event details

Edit `lib/site-config.ts` for the date, time, description, announcement text, and future shirt order URL. Set `shirtOrderUrl` to the official purchase URL when it is ready; the T-shirt button will activate automatically.

The current Matches table intentionally stores team labels as text until the rotating-partner score-entry and pairing workflow is finalized.
