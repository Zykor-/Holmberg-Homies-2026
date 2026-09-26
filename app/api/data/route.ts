import { calculateStandings, parsePlayerIds } from "@/lib/scores";
import {
  isAirtableConfigured,
  listMatches,
  listPlayers,
  listPotluck,
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
        standings: [],
        finals: [],
        potluck: [],
      },
      { headers: noStoreHeaders },
    );
  }

  try {
    const [playerRecords, matchRecords, potluckRecords] = await Promise.all([
      listPlayers(),
      listMatches(),
      listPotluck(),
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

    const games = matchRecords.map(({fields}) => ({
      id: fields["Match ID"] ?? "", round: fields.Round ?? "", type: fields["Match Type"] ?? "Round Robin",
      team1: fields["Team 1"] ?? "", team2: fields["Team 2"] ?? "",
      playerIds1: parsePlayerIds(fields["Team 1 Player IDs"]), playerIds2: parsePlayerIds(fields["Team 2 Player IDs"]),
      score1: fields["Team 1 Score"] ?? 0, score2: fields["Team 2 Score"] ?? 0, completed: fields.Completed === true,
    }));
    const standings = calculateStandings(games, players);

    const finals = matchRecords
      .filter(({ fields }) => fields["Match Type"] === "Finals" && fields.Completed === true)
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

    const playerNames = new Map(
      players.map((player) => [player.id, player.name]),
    );
    const potluck = potluckRecords
      .filter(({ fields }) => fields.Player && fields.Item)
      .flatMap(({ id, fields }) => {
        const playerId = fields.Player as string;
        const playerName = playerNames.get(playerId);
        if (!playerName) return [];
        return [
          {
            id: fields["Contribution ID"] ?? id,
            playerId,
            playerName,
            item: fields.Item as string,
          },
        ];
      })
      .sort((a, b) => a.playerName.localeCompare(b.playerName));

    return Response.json(
      {
        configured: true,
        players,
        standings,
        games,
        finals,
        potluck,
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
