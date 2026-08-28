# Holmberg Homies 2026

A mobile-friendly friends pickleball tournament and potluck site for Holmberg Park in Spokane. It supports player registration, one partner-format vote per registered player, a shared potluck list, Airtable-driven round-robin standings, and Airtable-driven finals pairings.

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
| Votes | Vote ID, Player, Partner Format Vote, Vote Date |
| Matches | Match ID, Round, Team 1, Team 2, Team 1 Score, Team 2 Score, Completed, Match Type |
| Potluck | Contribution ID, Player, Item, Updated At |

`Partner Format Vote` accepts `Random Partners` or `Choose Your Partners`. `Match Type` accepts `Round Robin` or `Finals`.

Standings are calculated from completed `Round Robin` records and sorted by wins, then point differential. Finals records are grouped by `Round` on the bracket.

## Environment variables

Copy `.dev.vars.example` to `.dev.vars` for local development and set:

```text
AIRTABLE_TOKEN=your_personal_access_token
AIRTABLE_BASE_ID=appvpjuRNIdjXagB0
AIRTABLE_PLAYERS_TABLE_ID=tblefvH7wtYbgPIU0
AIRTABLE_VOTES_TABLE_ID=tblQKbLXzQyle5qFh
AIRTABLE_MATCHES_TABLE_ID=tblfZs2qudo25ngxE
AIRTABLE_POTLUCK_TABLE_ID=tblkPVM8axmyPszi1
AIRTABLE_SHOW_VOTE_TOTALS=false
```

Create a narrowly scoped Airtable personal access token with record read/write access only to the tournament base. Keep the token out of GitHub and add it as a secret in the hosting dashboard. Set `AIRTABLE_SHOW_VOTE_TOTALS=true` later if live totals should be public.

## Local development

Requirements: Node.js 22 or newer.

```bash
npm ci
cp .dev.vars.example .dev.vars
npm run dev
```

## Cloudflare deployment

This full-stack build targets Cloudflare Workers with static assets because registration and voting require secure server-side functions. It deploys to a free `workers.dev` address; no custom domain is required.

For automatic GitHub deployment:

1. Push this project to a GitHub repository with `main` as the default branch.
2. Add repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
3. In Cloudflare, add `AIRTABLE_TOKEN` as an encrypted Worker secret. The base, table, and vote-visibility values are already configured in `wrangler.jsonc`.
4. Push to `main`. `.github/workflows/deploy.yml` builds and deploys the site.

For a manual first deployment:

```bash
npm run build
npx wrangler secret put AIRTABLE_TOKEN
npx wrangler deploy
```

The non-secret Airtable configuration values are already included in `wrangler.jsonc`.

## Updating event details

Edit `lib/site-config.ts` for the date, time, description, and announcement text. No code restructuring is needed when those details are decided.

Add a `Teams` table later if the vote outcome requires partner selection or generated teams. The current Matches table intentionally stores team labels as text until that decision is made.
