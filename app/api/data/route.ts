import {
  isAirtableConfigured,
  listMatches,
  listPlayers,
  listVotes,
  shouldShowVoteTotals,
} from "@/lib/airtable";

export const dynamic = "force-dynamic";

type Standing = {
  name: string;
  played: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  differential: number;
};

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  if (!isAirtableConfigured()) {
    return Response.json(
      {
        configured: false,
        players: [],
        showVoteTotals: false,
        voteTotals: null,
        standings: [],
        finals: [],
      },
      { headers: noStoreHeaders },
    );
  }

  try {
    const [playerRecords, voteRecords, matchRecords] = await Promise.all([
      listPlayers(),
      listVotes(),
      listMatches(),
    ]);

    const players = playerRecords
      .filter(
        ({ fields }) =>
          fields.Active === true && fields["Player ID"] && fields.Name,
      )
      .map(({ fields }) => ({
        id: fields["Player ID"] as string,
        name: fields.Name as string,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const voteTotals = voteRecords.reduce(
      (totals, { fields }) => {
        if (fields["Partner Format Vote"] === "Random Partners") {
          totals.randomPartners += 1;
          totals.total += 1;
        } else if (
          fields["Partner Format Vote"] === "Choose Your Partners"
        ) {
          totals.chooseYourPartners += 1;
          totals.total += 1;
        }
        return totals;
      },
      { randomPartners: 0, chooseYourPartners: 0, total: 0 },
    );

    const standingsByName = new Map<string, Standing>();
    const ensureStanding = (name: string) => {
      const existing = standingsByName.get(name);
      if (existing) return existing;
      const standing: Standing = {
        name,
        played: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        differential: 0,
      };
      standingsByName.set(name, standing);
      return standing;
    };

    for (const { fields } of matchRecords) {
      if (
        fields["Match Type"] !== "Round Robin" ||
        fields.Completed !== true ||
        !fields["Team 1"] ||
        !fields["Team 2"] ||
        typeof fields["Team 1 Score"] !== "number" ||
        typeof fields["Team 2 Score"] !== "number"
      ) {
        continue;
      }

      const team1 = ensureStanding(fields["Team 1"]);
      const team2 = ensureStanding(fields["Team 2"]);
      const score1 = fields["Team 1 Score"];
      const score2 = fields["Team 2 Score"];

      team1.played += 1;
      team2.played += 1;
      team1.pointsFor += score1;
      team1.pointsAgainst += score2;
      team2.pointsFor += score2;
      team2.pointsAgainst += score1;

      if (score1 > score2) {
        team1.wins += 1;
        team2.losses += 1;
      } else if (score2 > score1) {
        team2.wins += 1;
        team1.losses += 1;
      }
    }

    const standings = [...standingsByName.values()]
      .map((standing) => ({
        ...standing,
        differential: standing.pointsFor - standing.pointsAgainst,
      }))
      .sort(
        (a, b) =>
          b.wins - a.wins ||
          b.differential - a.differential ||
          a.name.localeCompare(b.name),
      );

    const finals = matchRecords
      .filter(({ fields }) => fields["Match Type"] === "Finals")
      .map(({ fields }) => ({
        id: fields["Match ID"] ?? crypto.randomUUID(),
        round: fields.Round ?? "Finals",
        team1: fields["Team 1"] ?? null,
        team2: fields["Team 2"] ?? null,
        team1Score:
          typeof fields["Team 1 Score"] === "number"
            ? fields["Team 1 Score"]
            : null,
        team2Score:
          typeof fields["Team 2 Score"] === "number"
            ? fields["Team 2 Score"]
            : null,
        completed: fields.Completed === true,
      }))
      .filter((match) => match.team1 || match.team2);

    const showVoteTotals = shouldShowVoteTotals();

    return Response.json(
      {
        configured: true,
        players,
        showVoteTotals,
        voteTotals: showVoteTotals ? voteTotals : null,
        standings,
        finals,
      },
      { headers: noStoreHeaders },
    );
  } catch {
    return Response.json(
      { error: "Tournament data is temporarily unavailable." },
      { status: 502, headers: noStoreHeaders },
    );
  }
}
