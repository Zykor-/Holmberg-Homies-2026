import {
  createPotluck,
  isAirtableConfigured,
  listPlayers,
  listPotluck,
  updatePotluck,
} from "@/lib/airtable";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isAirtableConfigured()) {
    return Response.json(
      {
        error: "The potluck list is not connected yet. Please check back soon.",
      },
      { status: 503 },
    );
  }

  try {
    const payload = (await request.json()) as {
      playerId?: unknown;
      item?: unknown;
      website?: unknown;
    };

    if (typeof payload.website === "string" && payload.website.trim()) {
      return Response.json(
        { error: "Unable to save the potluck item." },
        { status: 400 },
      );
    }

    const playerId =
      typeof payload.playerId === "string" ? payload.playerId.trim() : "";
    const item =
      typeof payload.item === "string"
        ? payload.item.trim().replace(/\s+/g, " ")
        : "";

    if (!playerId || item.length < 2 || item.length > 120) {
      return Response.json(
        {
          error:
            "Select your name and enter an item between 2 and 120 characters.",
        },
        { status: 400 },
      );
    }

    const [players, contributions] = await Promise.all([
      listPlayers(),
      listPotluck(),
    ]);
    const player = players.find(
      ({ fields }) =>
        fields.Active === true && fields["Player ID"] === playerId,
    );

    if (!player?.fields.Name) {
      return Response.json(
        { error: "Only currently registered players can join the potluck list." },
        { status: 403 },
      );
    }

    const now = new Date().toISOString();
    const existing = contributions.find(
      ({ fields }) => fields.Player === playerId,
    );

    if (existing) {
      await updatePotluck(existing.id, { Item: item, "Updated At": now });
    } else {
      await createPotluck({
        "Contribution ID": `potluck_${crypto.randomUUID()}`,
        Player: playerId,
        Item: item,
        "Updated At": now,
      });
    }

    return Response.json(
      {
        contribution: {
          playerId,
          playerName: player.fields.Name,
          item,
        },
      },
      { status: existing ? 200 : 201 },
    );
  } catch {
    return Response.json(
      { error: "Your potluck item could not be saved. Please try again." },
      { status: 502 },
    );
  }
}
